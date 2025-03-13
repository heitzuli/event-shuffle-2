import Koa from 'koa';
import Router from 'koa-router';
import bodyParser from 'koa-bodyparser';
import { Pool } from 'pg';

// Create a new pool instance
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

interface Event {
    id?: number;
    name: string;
    dates: Date[];
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

app
    .use(bodyParser())
    .use(router.routes())
    .use(router.allowedMethods());

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});