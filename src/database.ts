import { Pool } from 'pg';
import { Event, Vote } from './model';

/**
 * Service for interacting with the database
 */
class DatabaseService {
    private pool: Pool;

    constructor(pool: Pool) {
        this.pool = pool;
    }

    /**
     * Create the tables if they don't exist
     */
    async createTables() {
        const client = await this.pool.connect();
        try {
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
        } finally {
            client.release();
        }
    }

    /**
     * Create an event with the given name and dates
     * @param name
     * @param dates
     */
    async createEvent(name: string, dates: Date[])  {
        const client = await this.pool.connect();
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

            return { ...eventRes.rows[0], dates } as Event;
        } catch (err) {
            await client.query('ROLLBACK');
            console.error('Error inserting event and dates:', err);
            throw err;
        } finally {
            client.release();
        }
    }

    /**
     * Get the event with the given ID
     * @param eventId
     */
    async getEvent(eventId: number) {
        const client = await this.pool.connect();
        try {
            const eventRes = await client.query(`
                SELECT e.id, e.name, json_agg(d.date) AS dates
                FROM events e
                LEFT JOIN dates d ON e.id = d.event_id
                WHERE e.id = $1
                GROUP BY e.id
            `, [eventId]);

            if (eventRes.rows.length === 0) {
                return null;
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

            return {
                id: eventRes.rows[0].id,
                name: eventRes.rows[0].name,
                dates: eventRes.rows[0].dates,
                votes: votes
            } as Event;
        } finally {
            client.release();
        }
    }

    /**
     * Get all events
     */
    async getEvents() {
        const client = await this.pool.connect();
        try {
            const res = await client.query(`
                SELECT e.id, e.name, json_agg(d.date) AS dates
                FROM events e
                LEFT JOIN dates d ON e.id = d.event_id
                GROUP BY e.id
            `);

            return res.rows.map(row => ({
                id: row.id,
                name: row.name,
                dates: row.dates
            }) as Event);
        } finally {
            client.release();
        }
    }

    /**
     * Save votes for the given name and event ID
     * @param dates
     * @param name
     * @param eventId
     */
    async saveVotes(dates: string[], name: string, eventId: number) {
        const client = await this.pool.connect();
        try {
            await client.query('BEGIN');

            const votePromises = dates.map(date =>
                client.query(
                    'INSERT INTO votes (event_id, date, voter_name) VALUES ($1, $2, $3)',
                    [eventId, date, name]
                )
            );
            await Promise.all(votePromises);
            await client.query('COMMIT');
        } catch (err) {
            await client.query('ROLLBACK');
            console.error('Error adding votes:', err);
            throw err;
        } finally {
            client.release();
        }
    }
}

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

const databaseService = new DatabaseService(pool);

export { databaseService };