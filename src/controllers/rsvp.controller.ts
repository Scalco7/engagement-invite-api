import { Request, Response } from 'express';
import { RsvpService } from '../services/rsvp.service';
import { sanitizeAndFormatPhone } from '../utils/phone';

// Email validation helper
const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export class RsvpController {
  /**
   * Handles POST /rsvp - Validates request body, formats phone, and saves database record.
   */
  static async create(req: Request, res: Response): Promise<void> {
    try {
      const { name, email, phone_number, will_go } = req.body;
      const errors: string[] = [];

      // 1. Name Validation
      if (name === undefined || name === null) {
        errors.push("O campo 'name' é obrigatório.");
      } else if (typeof name !== 'string') {
        errors.push("O campo 'name' deve ser um texto (string).");
      } else {
        const trimmedName = name.trim();
        if (trimmedName.length < 2) {
          errors.push("O campo 'name' deve ter pelo menos 2 caracteres.");
        } else if (trimmedName.length > 100) {
          errors.push("O campo 'name' não pode exceder 100 caracteres.");
        }
      }

      // 2. Email Validation
      if (email === undefined || email === null) {
        errors.push("O campo 'email' é obrigatório.");
      } else if (typeof email !== 'string') {
        errors.push("O campo 'email' deve ser um texto (string).");
      } else {
        const trimmedEmail = email.trim();
        if (!isValidEmail(trimmedEmail)) {
          errors.push("O formato do 'email' fornecido é inválido.");
        }
      }

      // 3. Phone Number Validation
      if (phone_number === undefined || phone_number === null) {
        errors.push("O campo 'phone_number' é obrigatório.");
      } else if (typeof phone_number !== 'string') {
        errors.push("O campo 'phone_number' deve ser um texto (string).");
      } else {
        const digits = phone_number.replace(/\D/g, '');
        if (digits.length < 8) {
          errors.push("O número de telefone fornecido em 'phone_number' é muito curto (mínimo 8 dígitos numéricos).");
        } else if (digits.length > 15) {
          errors.push("O número de telefone fornecido em 'phone_number' é muito longo (máximo 15 dígitos numéricos).");
        }
      }

      // 4. Will Go Validation
      if (will_go === undefined || will_go === null) {
        errors.push("O campo 'will_go' é obrigatório.");
      } else if (typeof will_go !== 'boolean') {
        errors.push("O campo 'will_go' deve ser um valor booleano (true ou false).");
      }

      // If validation fails, return 400 Bad Request
      if (errors.length > 0) {
        res.status(400).json({
          status: 'error',
          message: 'Falha de validação nos dados enviados.',
          errors,
        });
        return;
      }

      // Format phone number to +55 format
      const formattedPhone = sanitizeAndFormatPhone(phone_number);

      // Save database record via Service
      const newRsvp = await RsvpService.createRsvp({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        phone_number: formattedPhone,
        will_go,
      });

      res.status(201).json({
        status: 'success',
        message: 'Confirmação de convite salva com sucesso!',
        data: newRsvp,
      });
    } catch (error: any) {
      // Handle unique constraint violations
      if (error.code === 'P2002') {
        const target = error.meta?.target || [];
        const fieldName = target.join(', ') || error.message || '';
        const friendlyField = fieldName.includes('email') ? 'e-mail' : 'telefone';
        res.status(400).json({
          status: 'error',
          message: `O ${friendlyField} informado já está cadastrado em outro RSVP.`,
        });
        return;
      }

      res.status(500).json({
        status: 'error',
        message: 'Erro interno ao salvar a confirmação no banco de dados.',
        error: error.message,
      });
    }
  }

  /**
   * Handles POST /rsvp/lookup - Finds RSVP by email and phone.
   */
  static async lookup(req: Request, res: Response): Promise<void> {
    try {
      const { email, phone_number } = req.body;
      const errors: string[] = [];

      // 1. Email Validation
      if (email === undefined || email === null) {
        errors.push("O campo 'email' é obrigatório.");
      } else if (typeof email !== 'string') {
        errors.push("O campo 'email' deve ser um texto (string).");
      } else {
        const trimmedEmail = email.trim();
        if (!isValidEmail(trimmedEmail)) {
          errors.push("O formato do 'email' fornecido é inválido.");
        }
      }

      // 2. Phone Number Validation
      if (phone_number === undefined || phone_number === null) {
        errors.push("O campo 'phone_number' é obrigatório.");
      } else if (typeof phone_number !== 'string') {
        errors.push("O campo 'phone_number' deve ser um texto (string).");
      } else {
        const digits = phone_number.replace(/\D/g, '');
        if (digits.length < 8) {
          errors.push("O número de telefone fornecido é inválido.");
        }
      }

      if (errors.length > 0) {
        res.status(400).json({
          status: 'error',
          message: 'Falha de validação nos dados enviados.',
          errors,
        });
        return;
      }

      const formattedPhone = sanitizeAndFormatPhone(phone_number);
      const rsvp = await RsvpService.findRsvpByEmailAndPhone(email.trim(), formattedPhone);

      if (!rsvp) {
        res.status(404).json({
          status: 'error',
          message: 'Nenhum RSVP correspondente foi encontrado com o e-mail e telefone fornecidos.',
        });
        return;
      }

      res.json({
        status: 'success',
        data: rsvp,
      });
    } catch (error: any) {
      res.status(500).json({
        status: 'error',
        message: 'Erro interno ao consultar o RSVP no banco de dados.',
        error: error.message,
      });
    }
  }

  /**
   * Handles GET /rsvp - Lists all RSVP database records.
   */
  static async list(req: Request, res: Response): Promise<void> {
    try {
      const rsvps = await RsvpService.getAllRsvps();
      res.json({
        status: 'success',
        count: rsvps.length,
        data: rsvps,
      });
    } catch (error: any) {
      res.status(500).json({
        status: 'error',
        message: 'Erro interno ao consultar as confirmações no banco de dados.',
        error: error.message,
      });
    }
  }
}
