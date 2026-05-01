import { Ticket } from '../entities/Ticket';

export type TicketDto = {
  id: string;
  concertId: string;
  totalStock: number;
  remainingStock: number;
  price: number;
  type: 'VIP' | 'NORMAL';
};

export function toTicketDto(ticket: Ticket): TicketDto {
  return {
    id: ticket.id,
    concertId: ticket.concertId,
    totalStock: ticket.totalStock,
    remainingStock: ticket.remainingStock,
    price: ticket.price,
    type: ticket.type,
  };
}

export function toTicketDtoList(tickets: Ticket[]): TicketDto[] {
  return tickets.map(toTicketDto);
}
