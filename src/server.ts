import Koa from 'koa';
import Router from 'koa-router';
import bodyParser from 'koa-bodyparser';
import { Pool } from 'pg';

// Create a new pool instance
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

interface Vote {
    date: Date;
    people: string[];
}

interface Event {
    id?: number;
    name: string;
    dates: Date[];
    votes?: Vote[];
}

const app = new Koa();
const router = new Router();

const createTables = async () => {
    const client = await pool.connect();
    await client.query(`
        CREATE TABLE IF NOT EXISTS events (
            id SERIAL PRIMARY KEY,
            name VARCHAR(255) NOT NULL
        );
    `);

    await client.query(`
        CREATE TABLE IF NOT EXISTS dates (
            id SERIAL PRIMARY KEY,
            event_id INTEGER REFERENCES events(id) ON DELETE CASCADE,
            date TIMESTAMP NOT NULL
        );
    `);

    await client.query(`
        CREATE TABLE IF NOT EXISTS votes (
            id SERIAL PRIMARY KEY,
            event_id INTEGER REFERENCES events(id) ON DELETE CASCADE,
            date TIMESTAMP NOT NULL,
            voter_name VARCHAR(255) NOT NULL
        );
    `);
};

createTables().catch(err => console.error('Error creating tables:', err));

router.get('/hello', async (ctx) => {
    const client = await pool.connect();
    const res = await client.query('SELECT NOW()');
    ctx.body = `hello world, current time: ${res.rows[0].now}`;
});

router.post('/events', async (ctx) => {
    const { name, dates } = ctx.request.body as Event;
    if (!name || !dates || dates.length === 0) {
        ctx.status = 400;
        ctx.body = { error: 'Event name and at least one date are required' };
        return;
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const eventRes = await client.query(
            'INSERT INTO events (name) VALUES ($1) RETURNING *',
            [name]
        );
        const eventId = eventRes.rows[0].id;

        const datePromises = dates.map(date =>
            client.query(
                'INSERT INTO dates (event_id, date) VALUES ($1, $2)',
                [eventId, date]
            )
        );
        await Promise.all(datePromises);

        await client.query('COMMIT');
        ctx.status = 201;
        ctx.body = { ...eventRes.rows[0], dates };
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Error inserting event and dates:', err);
        ctx.status = 500;
        ctx.body = { error: 'Internal server error' };
    } finally {
        client.release();
    }
});

router.get('/events', async (ctx) => {
    try {
        const client = await pool.connect();
        const res = await client.query(`
            SELECT e.id, e.name, json_agg(d.date) AS dates
            FROM events e
            LEFT JOIN dates d ON e.id = d.event_id
            GROUP BY e.id
        `);
        ctx.status = 200;
        ctx.body = res.rows;
    } catch (err) {
        console.error('Error retrieving events:', err);
        ctx.status = 500;
        ctx.body = { error: 'Internal server error' };
    }
});

router.get('/events/:id', async (ctx) => {
    const eventId = parseInt(ctx.params.id, 10);
    if (isNaN(eventId)) {
        ctx.status = 400;
        ctx.body = { error: 'Invalid event ID' };
        return;
    }

    try {
        const client = await pool.connect();
        const eventRes = await client.query(`
            SELECT e.id, e.name, json_agg(d.date) AS dates
            FROM events e
            LEFT JOIN dates d ON e.id = d.event_id
            WHERE e.id = $1
            GROUP BY e.id
        `, [eventId]);

        if (eventRes.rows.length === 0) {
            ctx.status = 404;
            ctx.body = { error: 'Event not found' };
            return;
        }

        const votesRes = await client.query(`
            SELECT date, json_agg(voter_name) AS people
            FROM votes
            WHERE event_id = $1
            GROUP BY date
        `, [eventId]);

        const votes: Vote[] = votesRes.rows.map(row => ({
            date: row.date,
            people: row.people
        }));

        const event: Event = {
            id: eventRes.rows[0].id,
            name: eventRes.rows[0].name,
            dates: eventRes.rows[0].dates,
            votes: votes
        };

        ctx.status = 200;
        ctx.body = event;
    } catch (err) {
        console.error('Error retrieving event:', err);
        ctx.status = 500;
        ctx.body = { error: 'Internal server error' };
    }
});

router.post('/events/:id/vote', async (ctx) => {
    const eventId = parseInt(ctx.params.id, 10);
    if (isNaN(eventId)) {
        ctx.status = 400;
        ctx.body = { error: 'Invalid event ID' };
        return;
    }

    const { name, votes } = ctx.request.body as { name: string, votes: string[] };
    if (!name || !votes || votes.length === 0) {
        ctx.status = 400;
        ctx.body = { error: 'Voter name and at least one vote are required' };
        return;
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const votePromises = votes.map(date =>
            client.query(
                'INSERT INTO votes (event_id, date, voter_name) VALUES ($1, $2, $3)',
                [eventId, date, name]
            )
        );
        await Promise.all(votePromises);

        const eventRes = await client.query(`
            SELECT e.id, e.name, json_agg(d.date) AS dates
            FROM events e
            LEFT JOIN dates d ON e.id = d.event_id
            WHERE e.id = $1
            GROUP BY e.id
        `, [eventId]);

        const votesRes = await client.query(`
            SELECT date, json_agg(voter_name) AS people
            FROM votes
            WHERE event_id = $1
            GROUP BY date
        `, [eventId]);

        const updatedVotes: Vote[] = votesRes.rows.map(row => ({
            date: row.date,
            people: row.people
        }));

        const updatedEvent: Event = {
            id: eventRes.rows[0].id,
            name: eventRes.rows[0].name,
            dates: eventRes.rows[0].dates,
            votes: updatedVotes
        };

        await client.query('COMMIT');
        ctx.status = 200;
        ctx.body = updatedEvent;
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Error adding votes:', err);
        ctx.status = 500;
        ctx.body = { error: 'Internal server error' };
    } finally {
        client.release();
    }
});

app
    .use(bodyParser())
    .use(router.routes())
    .use(router.allowedMethods());

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});