import { prisma } from '../db/prisma';

export interface CreateRsvpInput {
  name: string;
  phone_number: string;
  will_go: boolean;
}

export class RsvpService {
  /**
   * Persists a new RSVP confirmation response in the database.
   * 
   * @param data Validation-cleared RSVP input data
   * @returns The created RSVP record
   */
  static async createRsvp(data: CreateRsvpInput) {
    return prisma.rsvp.create({
      data: {
        name: data.name,
        phone_number: data.phone_number,
        will_go: data.will_go,
      },
    });
  }

  /**
   * Fetches all RSVP responses from the database.
   * 
   * @returns List of all RSVP records
   */
  static async getAllRsvps() {
    return prisma.rsvp.findMany();
  }
}
