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
    const rsvp = await prisma.rsvp.findUnique({
      where: { id: data.rsvpId },
    });

    if (!rsvp) {
      throw new Error('RSVP do convidado não encontrado.');
    }
    if (!rsvp.will_go) {
      throw new Error('Apenas convidados que confirmaram presença podem participar do bolão.');
    }

    // 2. Validate Question existence
    const question = await prisma.betQuestion.findUnique({
      where: { id: data.questionId },
    });

    if (!question) {
      throw new Error('Pergunta do bolão não encontrada.');
    }

    // 3. Type-specific validations for value
    if (question.type === 'GUEST_SELECT') {
      // Check if value is a valid UUID of a confirmed guest
      const targetGuest = await prisma.rsvp.findUnique({
        where: { id: data.value },
      });
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
    const existingBet = await prisma.guestBet.findUnique({
      where: {
        rsvpId_questionId: {
          rsvpId: data.rsvpId,
          questionId: data.questionId,
        },
      },
    });

    if (existingBet) {
      throw new Error('Você já registrou um palpite para esta pergunta.');
    }

    // 5. Persist the bet
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
    // Fetch all questions and their current bets
    const questions = await prisma.betQuestion.findMany({
      include: {
        bets: true,
      },
    });

    // Fetch all confirmed guests (needed for GUEST_SELECT questions)
    const confirmedGuests = await prisma.rsvp.findMany({
      where: { will_go: true },
      select: { id: true, name: true },
    });

    return questions.map((q) => {
      const totalVotes = q.bets.length;

      // Group bets by value
      const voteCounts: Record<string, number> = {};
      q.bets.forEach((bet) => {
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
        optionsWithOdds = q.options.map((option) => {
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
}
