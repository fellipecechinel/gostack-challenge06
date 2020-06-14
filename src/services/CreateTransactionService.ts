import { getRepository, getCustomRepository } from 'typeorm';
import AppError from '../errors/AppError';
import TransactionsRepository from '../repositories/TransactionsRepository';
import Transaction from '../models/Transaction';
import Category from '../models/Category';

interface Request {
  title: string;
  value: number;
  type: 'income' | 'outcome';
  category: string;
}

class CreateTransactionService {
  public async execute({
    title,
    value,
    type,
    category,
  }: Request): Promise<Transaction> {
    const transactionsRepository = getCustomRepository(TransactionsRepository);
    const categoryRepository = getRepository(Category);

    if (!['income', 'outcome'].includes(type)) {
      throw new AppError('Transaction type is not valid');
    }

    if (type === 'outcome') {
      const balance = await transactionsRepository.getBalance();
      const newTotal = balance.total - value;
      if (newTotal < 0) {
        throw new AppError(
          'Cannot create outcome transaction without a valid balance',
        );
      }
    }

    let relationCategory = await categoryRepository.findOne({
      where: {
        title: category,
      },
    });

    if (!relationCategory) {
      relationCategory = categoryRepository.create({
        title: category,
      });

      await categoryRepository.save(relationCategory);
    }

    const transaction = transactionsRepository.create({
      title,
      value,
      type,
      category_id: relationCategory.id,
    });

    await transactionsRepository.save(transaction);

    return transaction;
  }
}

export default CreateTransactionService;
