import { prisma } from '../db/prisma';

export interface CreateQuestionInput {
  title: string;
  type: 'TEXT' | 'NUMBER' | 'GUEST_SELECT';
  options?: string[];
}

export interface PlaceBetInput {
  rsvpId: string;
  questionId: string;
  value: string;
}

export class BetService {
  /**
   * Creates a new bet question.
   */
  static async createQuestion(data: CreateQuestionInput) {
    return prisma.betQuestion.create({
      data: {
        title: data.title,
        type: data.type,
        options: data.options || [],
      },
    });
  }

  /**
   * Places a guest's bet.
   * Validates rsvp, question, and value constraints.
   */
  static async placeBet(data: PlaceBetInput) {
    // 1. Validate RSVP existence and confirmation
    const rsvps = await prisma.$queryRaw<any[]>`
      SELECT * FROM "Rsvp" WHERE id = ${data.rsvpId} LIMIT 1
    `;
    const rsvp = rsvps[0] || null;

    if (!rsvp) {
      throw new Error('RSVP do convidado não encontrado.');
    }
    if (!rsvp.will_go) {
      throw new Error('Apenas convidados que confirmaram presença podem participar do bolão.');
    }

    // 2. Validate Question existence
    const questions = await prisma.$queryRaw<any[]>`
      SELECT * FROM "BetQuestion" WHERE id = ${data.questionId} LIMIT 1
    `;
    const question = questions[0] || null;

    if (!question) {
      throw new Error('Pergunta do bolão não encontrada.');
    }

    // 3. Type-specific validations for value
    if (question.type === 'GUEST_SELECT') {
      // Check if value is a valid UUID of a confirmed guest
      const targetGuests = await prisma.$queryRaw<any[]>`
        SELECT * FROM "Rsvp" WHERE id = ${data.value} LIMIT 1
      `;
      const targetGuest = targetGuests[0] || null;
      if (!targetGuest) {
        throw new Error('A opção selecionada deve ser um convidado existente.');
      }
      if (!targetGuest.will_go) {
        throw new Error('A opção selecionada deve ser um convidado com presença confirmada.');
      }
    } else if (question.type === 'NUMBER') {
      // Check if value is a valid numeric string
      const isNum = !isNaN(Number(data.value)) && data.value.trim() !== '';
      if (!isNum) {
        throw new Error('A resposta para esta pergunta deve ser um número válido.');
      }
    }

    // 4. Validate unique constraint (one vote per question)
    const existingBets = await prisma.$queryRaw<any[]>`
      SELECT * FROM "GuestBet" WHERE "rsvpId" = ${data.rsvpId} AND "questionId" = ${data.questionId} LIMIT 1
    `;
    const existingBet = existingBets[0] || null;

    if (existingBet) {
      throw new Error('Você já registrou um palpite para esta pergunta.');
    }

    // 5. Persist the bet using ORM
    return prisma.guestBet.create({
      data: {
        rsvpId: data.rsvpId,
        questionId: data.questionId,
        value: data.value,
      },
    });
  }

  /**
   * Lists all questions along with options and their dynamic odds.
   */
  static async listQuestionsWithOdds() {
    // Fetch all questions and their current bets via raw SQL SELECTs
    const questions = await prisma.$queryRaw<any[]>`SELECT * FROM "BetQuestion"`;
    const bets = await prisma.$queryRaw<any[]>`SELECT * FROM "GuestBet"`;

    // Fetch all confirmed guests (needed for GUEST_SELECT questions) via raw SQL SELECT
    const confirmedGuests = await prisma.$queryRaw<any[]>`
      SELECT id, name FROM "Rsvp" WHERE will_go = true
    `;

    // Map bets to questions in memory
    const questionsWithBets = questions.map((q: any) => {
      const qBets = bets.filter((b: any) => b.questionId === q.id);
      return {
        ...q,
        bets: qBets,
      };
    });

    return questionsWithBets.map((q: any) => {
      const totalVotes = q.bets.length;

      // Group bets by value
      const voteCounts: Record<string, number> = {};
      q.bets.forEach((bet: any) => {
        voteCounts[bet.value] = (voteCounts[bet.value] || 0) + 1;
      });

      // Odd helper function
      const calculateOdd = (votes: number): number => {
        if (totalVotes === 0) return 1.0;
        if (votes > 0) {
          return parseFloat((totalVotes / votes).toFixed(2));
        }
        return parseFloat((totalVotes + 1).toFixed(2)); // Zebra absolute odd
      };

      let optionsWithOdds: Array<{ value: string; label: string; votes: number; odd: number }> = [];

      if (q.type === 'GUEST_SELECT') {
        // Options are all confirmed guests
        optionsWithOdds = confirmedGuests.map((guest) => {
          const votes = voteCounts[guest.id] || 0;
          return {
            value: guest.id,
            label: guest.name,
            votes,
            odd: calculateOdd(votes),
          };
        });
      } else if (q.options && q.options.length > 0) {
        // Options are predefined in the question
        optionsWithOdds = q.options.map((option: any) => {
          const votes = voteCounts[option] || 0;
          return {
            value: option,
            label: option,
            votes,
            odd: calculateOdd(votes),
          };
        });
      } else {
        // Open-ended (TEXT/NUMBER) - list only options that have received at least 1 vote
        optionsWithOdds = Object.keys(voteCounts).map((val) => {
          const votes = voteCounts[val];
          return {
            value: val,
            label: val,
            votes,
            odd: calculateOdd(votes),
          };
        });
      }

      // Sort options by votes descending
      optionsWithOdds.sort((a, b) => b.votes - a.votes);

      return {
        id: q.id,
        title: q.title,
        type: q.type,
        totalVotes,
        options: optionsWithOdds,
      };
    });
  }

  /**
   * Retrieves all bets placed by a specific guest.
   */
  static async getBetsByRsvpId(rsvpId: string) {
    // 1. Validate RSVP existence
    const rsvps = await prisma.$queryRaw<any[]>`
      SELECT * FROM "Rsvp" WHERE id = ${rsvpId} LIMIT 1
    `;
    const rsvp = rsvps[0] || null;

    if (!rsvp) {
      throw new Error('Convidado não encontrado.');
    }

    // 2. Fetch and return guest bets
    return prisma.$queryRaw<any[]>`
      SELECT * FROM "GuestBet" WHERE "rsvpId" = ${rsvpId}
    `;
  }
}
