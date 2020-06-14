import csvParse from 'csv-parse';
import fs from 'fs';
import { getRepository, getCustomRepository, In } from 'typeorm';
import AppError from '../errors/AppError';
import Category from '../models/Category';
import Transaction from '../models/Transaction';
import TransactionsRepository from '../repositories/TransactionsRepository';

interface Request {
  title: string;
  type: 'income' | 'outcome';
  value: number;
  category: string;
}

class ImportTransactionsService {
  async execute(csvPath: string): Promise<Transaction[]> {
    const transactionsRepository = getCustomRepository(TransactionsRepository);
    const categoryRepository = getRepository(Category);

    const readCSVStream = fs.createReadStream(csvPath);
    try {
      const parseStream = csvParse({
        from_line: 2,
        ltrim: true,
        rtrim: true,
      });

      const parseCSV = readCSVStream.pipe(parseStream);

      const lines: Request[] = [];

      parseCSV.on('data', line => {
        const [title, type, value, category] = line;

        if (!title || !type || !value || !category) return;

        lines.push({
          title,
          type,
          category,
          value,
        });
      });

      await new Promise(resolve => {
        parseCSV.on('end', resolve);
      });

      if (lines.length < 1) {
        throw new AppError('File is empty');
      }

      const categoriesTitle = lines.map(line => line.category);

      // Insert all categories non existent
      const categoriesInDatabase = await categoryRepository.find({
        select: ['id', 'title'],
        where: {
          title: In(categoriesTitle),
        },
      });

      const categoryTitlesInDatabase = categoriesInDatabase.map(
        category => category.title,
      );

      const categoriesToInsertWithDuplicates = categoriesTitle.filter(
        category => !categoryTitlesInDatabase.includes(category),
      );

      const categoriesToInsert = [
        ...Array.from(new Set(categoriesToInsertWithDuplicates)),
      ];

      const categoriesCreated = categoryRepository.create(
        categoriesToInsert.map(title => ({
          title,
        })),
      );

      await categoryRepository.save(categoriesCreated);

      const allCategories = [...categoriesCreated, ...categoriesInDatabase];

      // Insert the transactions
      const transactions = transactionsRepository.create(
        lines.map(({ title, type, value, category: categoryTitle }) => ({
          title,
          type,
          value,
          category: allCategories.find(
            category => category.title === categoryTitle,
          ),
        })),
      );

      await transactionsRepository.save(transactions);

      return transactions;
    } catch (err) {
      console.log(err);
      throw new AppError('Fail to import csv file');
    } finally {
      await fs.promises.unlink(csvPath);
      readCSVStream.close();
    }
  }
}

export default ImportTransactionsService;
