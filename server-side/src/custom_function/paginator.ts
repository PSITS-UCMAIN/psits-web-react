import { Model, FilterQuery, ProjectionType, SortOrder } from 'mongoose';

/**
 * Query parameters used by `PaginatedList.createAsync` to load a page from a Mongoose model.
 *
 * @typeParam T - The document/lean type for the Mongoose model (the item type returned).
 * @property model - Mongoose `Model<T>` used to run the queries.
 * @property filter - Mongo filter passed to `model.find(...)`.
 * @property select - Projection applied via `.select(...)`.
 * @property sort - Sort descriptor passed to `.sort(...)`.
 *
 * @example
 * const q: IPaginationQuery<User> = {
 *   model: UserModel,
 *   filter: { active: true },
 *   select: 'name email',
 *   sort: { createdAt: -1 }
 * };
 */
interface IPaginationQuery<T> {
    model: Model<T>;
    filter: FilterQuery<T>;
    select: ProjectionType<T>;
    sort: Record<string, SortOrder>;
}

/**
 * Generic container representing a single page of results.
 *
 * @typeParam T - Item type stored in `items`.
 *
 * @remarks
 * - `items` contains the page items (type `T[]`).
 * - `totalCount` is the total number of matching documents across all pages.
 * - `pageNumber` is 1-based.
 * - `totalPages` is computed as `Math.ceil(totalCount / pageSize)`.
 *
 * @example
 * const page = new PaginatedList<User>(users, totalCount, 2, 20);
 */
class PaginatedList<T> {
    /** Page items (typed array). */
    public items: T[];
    /** Total number of items across all pages. */
    public totalCount: number;
    /** Current 1-based page number. */
    public pageNumber: number;
    /** Total computed pages for the supplied `pageSize`. */
    public totalPages: number;

    /**
     * Construct a new paginated result.
     *
     * @param items - Array of page items (type `T[]`).
     * @param count - Total number of matching items across all pages.
     * @param pageNumber - Current 1-based page number.
     * @param pageSize - Items per page (used to compute `totalPages`).
     */
    constructor(items: T[], count: number, pageNumber: number, pageSize: number) {
        this.totalCount = count;
        this.totalPages = pageSize > 0 ? Math.ceil(count / pageSize) : 0;
        this.pageNumber = Math.min(Math.max(1, pageNumber), PaginatedList.maxPageNumber(this.totalPages));
        this.items = items;
    }

    /**
     * Helper method for getting max page number.
     */
    private static maxPageNumber(totalPages: number): number {
        return Math.max(1, totalPages);
    }

    /**
     * Indicates whether a previous page exists.
     *
     * @returns `true` when `pageNumber > 1` and `pageNumber <= totalPages + 1`.
     *
     */
    public get hasPreviousPage(): boolean {
        return this.pageNumber > 1;
    }

    /**
     * Indicates whether a next page exists.
     *
     * @returns `true` when `pageNumber < totalPages`.
     */
    public get hasNextPage(): boolean {
        return this.pageNumber < this.totalPages;
    }

    /**
     * Load a page from the database and return a typed `PaginatedList<T>`.
     *
     * @typeParam T - The result type expected from the model query (use `lean<T>()` if you want POJOs).
     * @param query - `IPaginationQuery<T>` describing `model`, `filter`, `select`, and `sort`.
     * @param pageNumber - 1-based page number to load.
     * @param pageSize - Number of items per page.
     * @returns Promise resolving to `PaginatedList<T>` containing the loaded items and pagination metadata.
     *
     * @remarks
     * - The method calls `model.countDocuments(filter)` and `model.find(filter).select(select).sort(sort).skip(...).limit(...).lean<T>()`.
     * - Use `lean<T>()` when you only need plain objects (better performance). If you need Mongoose `Document` behavior, remove `lean()` and adjust types accordingly.
     */
    public static async createAsync<T>(query: IPaginationQuery<T>, pageNumber: number, pageSize: number): Promise<PaginatedList<T>> {
        const { model, filter, select, sort } = query;

        const [count, items] = await Promise.all([
            model.countDocuments(filter),
            model.find(filter)
                .select(select)
                .sort(sort)
                .skip((pageNumber - 1) * pageSize)
                .limit(pageSize)
                .lean<T[]>()
        ]);

        return new PaginatedList<T>(items, count, pageNumber, pageSize);
    }
}

export { PaginatedList, IPaginationQuery };