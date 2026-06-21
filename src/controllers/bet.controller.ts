import { Request, Response } from 'express';
import { BetService } from '../services/bet.service';

export class BetController {
  /**
   * Handles POST /bets/questions - Creates a new bet question.
   */
  static async createQuestion(req: Request, res: Response): Promise<void> {
    try {
      const { title, type, options } = req.body;
      const errors: string[] = [];

      // 1. Title Validation
      if (!title) {
        errors.push("O campo 'title' é obrigatório.");
      } else if (typeof title !== 'string') {
        errors.push("O campo 'title' deve ser um texto (string).");
      } else if (title.trim().length < 5) {
        errors.push("O campo 'title' deve ter pelo menos 5 caracteres.");
      }

      // 2. Type Validation
      const validTypes = ['TEXT', 'NUMBER', 'GUEST_SELECT'];
      if (!type) {
        errors.push("O campo 'type' é obrigatório.");
      } else if (!validTypes.includes(type)) {
        errors.push(`O campo 'type' deve ser um dos seguintes: ${validTypes.join(', ')}.`);
      }

      // 3. Options Validation (if provided)
      if (options !== undefined && !Array.isArray(options)) {
        errors.push("O campo 'options' deve ser uma lista (array) de strings.");
      } else if (options && options.some((opt: any) => typeof opt !== 'string' || opt.trim() === '')) {
        errors.push("Todos os itens de 'options' devem ser textos (strings) não vazios.");
      }

      if (errors.length > 0) {
        res.status(400).json({
          status: 'error',
          message: 'Falha de validação nos dados enviados.',
          errors,
        });
        return;
      }

      const question = await BetService.createQuestion({
        title: title.trim(),
        type,
        options,
      });

      res.status(201).json({
        status: 'success',
        message: 'Pergunta do bolão criada com sucesso!',
        data: question,
      });
    } catch (error: any) {
      res.status(500).json({
        status: 'error',
        message: 'Erro interno ao criar pergunta no banco de dados.',
        error: error.message,
      });
    }
  }

  /**
   * Handles POST /bets/place - Places a guest bet.
   */
  static async placeBet(req: Request, res: Response): Promise<void> {
    try {
      const { rsvpId, questionId, value } = req.body;
      const errors: string[] = [];

      // 1. rsvpId Validation
      if (!rsvpId) {
        errors.push("O campo 'rsvpId' é obrigatório.");
      } else if (typeof rsvpId !== 'string') {
        errors.push("O campo 'rsvpId' deve ser um texto (string/UUID).");
      }

      // 2. questionId Validation
      if (!questionId) {
        errors.push("O campo 'questionId' é obrigatório.");
      } else if (typeof questionId !== 'string') {
        errors.push("O campo 'questionId' deve ser um texto (string/UUID).");
      }

      // 3. Value Validation
      if (value === undefined || value === null) {
        errors.push("O campo 'value' é obrigatório.");
      } else if (typeof value !== 'string') {
        errors.push("O campo 'value' deve ser um texto (string).");
      } else if (value.trim() === '') {
        errors.push("O campo 'value' não pode ser vazio.");
      }

      if (errors.length > 0) {
        res.status(400).json({
          status: 'error',
          message: 'Falha de validação nos dados enviados.',
          errors,
        });
        return;
      }

      const bet = await BetService.placeBet({
        rsvpId,
        questionId,
        value: value.trim(),
      });

      res.status(201).json({
        status: 'success',
        message: 'Palpite registrado com sucesso!',
        data: bet,
      });
    } catch (error: any) {
      // Detect business rule errors and return 400 instead of 500
      const isBusinessRule = error.message.includes('não encontrado') || 
                             error.message.includes('Apenas convidados') || 
                             error.message.includes('já registrou') ||
                             error.message.includes('deve ser um');
                             
      const statusCode = isBusinessRule ? 400 : 500;
      const message = isBusinessRule 
        ? 'Falha nas regras de negócio da aposta.' 
        : 'Erro interno ao registrar palpite no banco de dados.';
                      
      res.status(statusCode).json({
        status: 'error',
        message,
        error: error.message,
      });
    }
  }

  /**
   * Handles GET /bets/questions - Lists questions with live dynamic odds.
   */
  static async listQuestions(req: Request, res: Response): Promise<void> {
    try {
      const questions = await BetService.listQuestionsWithOdds();
      res.json({
        status: 'success',
        count: questions.length,
        data: questions,
      });
    } catch (error: any) {
      res.status(500).json({
        status: 'error',
        message: 'Erro interno ao consultar as perguntas do bolão no banco de dados.',
        error: error.message,
      });
    }
  }

  /**
   * Handles GET /bets/rsvp/:rsvpId - Lists all bets for a specific guest.
   */
  static async getBetsByRsvp(req: Request, res: Response): Promise<void> {
    try {
      const { rsvpId } = req.params;

      if (!rsvpId) {
        res.status(400).json({
          status: 'error',
          message: "O parâmetro 'rsvpId' é obrigatório.",
        });
        return;
      }

      const bets = await BetService.getBetsByRsvpId(rsvpId);

      res.json({
        status: 'success',
        count: bets.length,
        data: bets,
      });
    } catch (error: any) {
      const isNotFound = error.message.includes('não encontrado');
      const statusCode = isNotFound ? 404 : 500;
      const message = isNotFound 
        ? 'Convidado não encontrado.' 
        : 'Erro interno ao consultar as apostas do convidado no banco de dados.';

      res.status(statusCode).json({
        status: 'error',
        message,
        error: error.message,
      });
    }
  }
}
