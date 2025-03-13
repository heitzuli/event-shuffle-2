import Koa from 'koa';
import Router from 'koa-router';
import { Client } from 'pg';

const app = new Koa();
const router = new Router();

const client = new Client({
    connectionString: process.env.DATABASE_URL,
});

client.connect();

router.get('/hello', async (ctx) => {
    const res = await client.query('SELECT NOW()');
    ctx.body = `hello world, current time: ${res.rows[0].now}`;
});

app
    .use(router.routes())
    .use(router.allowedMethods());

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});