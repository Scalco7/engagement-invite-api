import { prisma } from '../db/prisma';

export interface CreateRsvpInput {
  name: string;
  email: string;
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
        email: data.email,
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
    return prisma.$queryRaw<any[]>`SELECT * FROM "Rsvp"`;
  }

  /**
   * Finds an RSVP by exact email and formatted phone number.
   * 
   * @param email The user email
   * @param phoneNumber The formatted phone number
   * @returns The RSVP record if found, otherwise null
   */
  static async findRsvpByEmailAndPhone(email: string, phoneNumber: string) {
    const rsvps = await prisma.$queryRaw<any[]>`
      SELECT * FROM "Rsvp"
      WHERE LOWER(email) = LOWER(${email}) AND phone_number = ${phoneNumber}
      LIMIT 1
    `;
    return rsvps[0] || null;
  }
}
