import { Request, Response } from 'express';
import { RsvpService } from '../services/rsvp.service';
import { sanitizeAndFormatPhone } from '../utils/phone';

export class RsvpController {
  /**
   * Handles POST /rsvp - Validates request body, formats phone, and saves database record.
   */
  static async create(req: Request, res: Response): Promise<void> {
    try {
      const { name, phone_number, will_go } = req.body;
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

      // 2. Phone Number Validation
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

      // 3. Will Go Validation
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
        phone_number: formattedPhone,
        will_go,
      });

      res.status(201).json({
        status: 'success',
        message: 'Confirmação de convite salva com sucesso!',
        data: newRsvp,
      });
    } catch (error: any) {
      res.status(500).json({
        status: 'error',
        message: 'Erro interno ao salvar a confirmação no banco de dados.',
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
