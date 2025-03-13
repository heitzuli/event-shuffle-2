import Koa from 'koa';
import Router from 'koa-router';
import bodyParser from 'koa-bodyparser';
import { Event } from './model';
import {databaseService} from "./database";

const app = new Koa();
const router = new Router();

databaseService.createTables().catch(err => console.error('Error creating tables:', err));

router.post('/events', async (ctx) => {
    const { name, dates } = ctx.request.body as Event;
    if (!name || !dates || dates.length === 0) {
        ctx.status = 400;
        ctx.body = { error: 'Event name and at least one date are required' };
        return;
    }

    try {
        const event = await databaseService.createEvent(name, dates);
        ctx.status = 201;
        ctx.body = event;
    } catch (err) {
        ctx.status = 500;
        ctx.body = { error: 'Internal server error' };
    }
});

router.get('/events', async (ctx) => {
    try {
        const events = await databaseService.getEvents();
        ctx.status = 200;
        ctx.body = events;
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
        const event = await databaseService.getEvent(eventId);
        if (!event) {
            ctx.status = 404;
            ctx.body = { error: 'Event not found' };
            return;
        }

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

    const event = await databaseService.getEvent(eventId);

    if (!event) {
        ctx.status = 404;
        ctx.body = { error: 'Event not found' };
        return;
    }

    // Convert event dates to ISO string format for comparison
    const eventDates = event.dates.map(date => new Date(date).toISOString());

    // Validate that all dates in the votes exist in the event
    const invalidDates = votes.filter(date => !eventDates.includes(new Date(date).toISOString()));

    if (invalidDates.length > 0) {
        ctx.status = 400;
        ctx.body = { error: `Invalid dates: ${invalidDates.join(', ')}` };
        return;
    }

    try {
        await databaseService.saveVotes(votes, name, eventId);
        const updatedEvent = await databaseService.getEvent(eventId);
        ctx.status = 200;
        ctx.body = updatedEvent;
    } catch (err) {
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