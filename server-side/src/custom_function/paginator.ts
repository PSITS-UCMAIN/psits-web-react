import { Model, FilterQuery, ProjectionType, SortOrder } from 'mongoose';

interface IPaginationQuery<T> {
    model: Model<T>;
    filter: FilterQuery<T>;
    select: ProjectionType<T>;
    sort: Record<string, SortOrder>;
}

class PaginatedList<T> {
    public items: T[];
    public totalCount: number;
    public pageNumber: number;
    public totalPages: number;

    constructor(items: T[], count: number, pageNumber: number, pageSize: number) {
        this.pageNumber = pageNumber;
        this.totalCount = count;
        this.totalPages = Math.ceil(count / pageSize);
        this.items = items;
    }

    public get hasPreviousPage(): boolean {
        return this.pageNumber > 1 && this.pageNumber <= this.totalPages + 1;
    }

    public get hasNextPage(): boolean {
        return this.pageNumber < this.totalPages;
    }

    public static async createAsync<T>(query: IPaginationQuery<T>, pageNumber: number, pageSize: number): Promise<PaginatedList<T>> {
        const { model, filter, select, sort } = query;

        const [count, items] = await Promise.all([
            model.countDocuments(filter),
            model.find(filter)
                .select(select)
                .sort(sort)
                .skip((pageNumber - 1) * pageSize)
                .lean<T[]>()
        ]);

        return new PaginatedList<T>(items, count, pageNumber, pageSize);
    }
}

export { PaginatedList, IPaginationQuery };