import { getCustomRepository } from 'typeorm';
import AppError from '../errors/AppError';
import TransactionsRepository from '../repositories/TransactionsRepository';

class DeleteTransactionService {
  private transactionsRepository: TransactionsRepository;

  constructor() {
    this.transactionsRepository = getCustomRepository(TransactionsRepository);
  }

  public async execute(transactionId: string): Promise<void> {
    const existTransaction = await this.transactionsRepository.count({
      where: {
        id: transactionId,
      },
    });

    if (existTransaction < 1) {
      throw new AppError('Transaction does not exists');
    }

    await this.transactionsRepository.delete(transactionId);
  }
}

export default DeleteTransactionService;
