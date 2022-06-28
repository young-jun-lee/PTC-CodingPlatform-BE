import { Request, Response } from 'express';
import { Session, SessionData } from 'express-session';
import { Redis } from 'ioredis';

// creating a TS type for orm.em that we pass through into our resolver so that it knows what type
// of object to expect
export type MyContext = {
  req: Request & {
    session: Session & Partial<SessionData> & { userId?: number };
  };
  redis: Redis;
  res: Response;
};
