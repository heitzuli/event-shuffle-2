export interface Vote {
    date: Date;
    people: string[];
}

export interface Event {
    id?: number;
    name: string;
    dates: Date[];
    votes?: Vote[];
}