import { UserBook } from "./Book";

export interface ReadingEvent {
  id?: string,
  creationDate?: string,
  modificationDate?: Date,
  eventType: ReadingEventType,
  startDate?: Date,
  endDate?: Date,
}

export interface CreateReadingEvent {
  eventDate?: Date,
  bookId?: string,
  eventType: ReadingEventType,
  startDate?: Date,
}

export interface ReadingEventWithUserBook {
  id?: string,
  creationDate?: string,
  modificationDate?: Date,
  eventType: ReadingEventType,
  userBook: UserBook,
  startDate?: Date,
  endDate?: Date,
}

export enum ReadingEventType {
  FINISHED = 'FINISHED',
  DROPPED = 'DROPPED',
  CURRENTLY_READING = 'CURRENTLY_READING',
  MARKED_OWNED = 'MARKED_OWNED',
  MARKED_TO_READ = 'MARKED_TO_READ',
  MARKED_BORROWED = 'MARKED_BORROWED',
  NONE = 'NONE'
}

