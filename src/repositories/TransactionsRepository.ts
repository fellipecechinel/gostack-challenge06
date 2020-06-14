import { EntityRepository, Repository } from 'typeorm';

import Transaction from '../models/Transaction';

interface Balance {
  income: number;
  outcome: number;
  total: number;
}

@EntityRepository(Transaction)
class TransactionsRepository extends Repository<Transaction> {
  public async getBalance(transactionsParam?: Transaction[]): Promise<Balance> {
    let transactions = transactionsParam;

    if (!transactions) {
      transactions = await this.find();
    }

    const balance: Balance = transactions.reduce(
      (sum, next) => {
        return {
          total: sum.total + next.value * (next.type === 'outcome' ? -1 : 1),
          income: sum.income + (next.type === 'income' ? next.value : 0),
          outcome: sum.outcome + (next.type === 'outcome' ? next.value : 0),
        };
      },
      {
        total: 0,
        income: 0,
        outcome: 0,
      },
    );
    return balance;
  }
}

export default TransactionsRepository;
