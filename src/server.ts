import Koa from 'koa';
import Router from 'koa-router';
import bodyParser from 'koa-bodyparser';
import { Client } from 'pg';

const app = new Koa();
const router = new Router();

const client = new Client({
    connectionString: process.env.DATABASE_URL,
});

client.connect();

const createTables = async () => {
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
    const res = await client.query('SELECT NOW()');
    ctx.body = `hello world, current time: ${res.rows[0].now}`;
});

router.post('/events', async (ctx) => {
    const { name } = ctx.request.body as { name: string };
    if (!name) {
        ctx.status = 400;
        ctx.body = { error: 'Event name is required' };
        return;
    }

    try {
        const res = await client.query(
            'INSERT INTO events (name) VALUES ($1) RETURNING *',
            [name]
        );
        ctx.status = 201;
        ctx.body = res.rows[0];
    } catch (err) {
        console.error('Error inserting event:', err);
        ctx.status = 500;
        ctx.body = { error: 'Internal server error' };
    }
});

router.get('/events', async (ctx) => {
    try {
        const res = await client.query('SELECT * FROM events');
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