/**
 * Vectabase Client - Drop-in replacement for Supabase client
 * Routes database queries through self-hosted Vectabase API to avoid egress costs
 */

const VECTABASE_URL = import.meta.env.VITE_VECTABASE_URL || 'https://hub.vectabase.com';
const VECTABASE_KEY = import.meta.env.VITE_VECTABASE_KEY || '';

interface QueryResult<T = any> {
    data: T[] | null;
    error: { message: string; details?: string } | null;
    count?: number;
}

interface SingleResult<T = any> {
    data: T | null;
    error: { message: string; details?: string } | null;
}

class VectabaseQueryBuilder<T = any> {
    private tableName: string;
    private selectColumns: string = '*';
    private whereConditions: string[] = [];
    private orderByClause: string = '';
    private limitCount: number | null = null;
    private offsetCount: number | null = null;
    private isSingleResult: boolean = false;
    private insertData: any = null;
    private updateData: any = null;
    private deleteMode: boolean = false;
    private upsertData: any = null;
    private onConflictColumn: string = '';

    constructor(table: string) {
        this.tableName = table;
    }

    select(columns: string = '*') {
        this.selectColumns = columns;
        return this;
    }

    insert(data: any) {
        this.insertData = Array.isArray(data) ? data : [data];
        return this;
    }

    update(data: any) {
        this.updateData = data;
        return this;
    }

    delete() {
        this.deleteMode = true;
        return this;
    }

    upsert(data: any, options?: { onConflict?: string }) {
        this.upsertData = Array.isArray(data) ? data : [data];
        this.onConflictColumn = options?.onConflict || 'id';
        return this;
    }

    eq(column: string, value: any) {
        this.whereConditions.push(`${column} = '${this.escapeValue(value)}'`);
        return this;
    }

    neq(column: string, value: any) {
        this.whereConditions.push(`${column} != '${this.escapeValue(value)}'`);
        return this;
    }

    gt(column: string, value: any) {
        this.whereConditions.push(`${column} > '${this.escapeValue(value)}'`);
        return this;
    }

    gte(column: string, value: any) {
        this.whereConditions.push(`${column} >= '${this.escapeValue(value)}'`);
        return this;
    }

    lt(column: string, value: any) {
        this.whereConditions.push(`${column} < '${this.escapeValue(value)}'`);
        return this;
    }

    lte(column: string, value: any) {
        this.whereConditions.push(`${column} <= '${this.escapeValue(value)}'`);
        return this;
    }

    like(column: string, pattern: string) {
        this.whereConditions.push(`${column} LIKE '${this.escapeValue(pattern)}'`);
        return this;
    }

    ilike(column: string, pattern: string) {
        this.whereConditions.push(`${column} ILIKE '${this.escapeValue(pattern)}'`);
        return this;
    }

    is(column: string, value: null | boolean) {
        if (value === null) {
            this.whereConditions.push(`${column} IS NULL`);
        } else {
            this.whereConditions.push(`${column} IS ${value}`);
        }
        return this;
    }

    in(column: string, values: any[]) {
        const escaped = values.map(v => `'${this.escapeValue(v)}'`).join(', ');
        this.whereConditions.push(`${column} IN (${escaped})`);
        return this;
    }

    order(column: string, options?: { ascending?: boolean }) {
        const direction = options?.ascending === false ? 'DESC' : 'ASC';
        this.orderByClause = `ORDER BY ${column} ${direction}`;
        return this;
    }

    limit(count: number) {
        this.limitCount = count;
        return this;
    }

    range(from: number, to: number) {
        this.offsetCount = from;
        this.limitCount = to - from + 1;
        return this;
    }

    single(): Promise<SingleResult<T>> {
        this.isSingleResult = true;
        this.limitCount = 1;
        return this.execute() as Promise<SingleResult<T>>;
    }

    maybeSingle(): Promise<SingleResult<T>> {
        this.isSingleResult = true;
        this.limitCount = 1;
        return this.execute() as Promise<SingleResult<T>>;
    }

    private escapeValue(value: any): string {
        if (value === null || value === undefined) return 'NULL';
        if (typeof value === 'number') return String(value);
        if (typeof value === 'boolean') return value ? 'true' : 'false';
        return String(value).replace(/'/g, "''");
    }

    private buildSQL(): string {
        // INSERT
        if (this.insertData) {
            const columns = Object.keys(this.insertData[0]).join(', ');
            const values = this.insertData.map((row: any) => {
                const vals = Object.values(row).map(v =>
                    v === null ? 'NULL' : `'${this.escapeValue(v)}'`
                ).join(', ');
                return `(${vals})`;
            }).join(', ');
            return `INSERT INTO ${this.tableName} (${columns}) VALUES ${values} RETURNING *`;
        }

        // UPDATE
        if (this.updateData) {
            const sets = Object.entries(this.updateData)
                .map(([k, v]) => `${k} = ${v === null ? 'NULL' : `'${this.escapeValue(v)}'`}`)
                .join(', ');
            const where = this.whereConditions.length > 0
                ? `WHERE ${this.whereConditions.join(' AND ')}`
                : '';
            return `UPDATE ${this.tableName} SET ${sets} ${where} RETURNING *`;
        }

        // DELETE
        if (this.deleteMode) {
            const where = this.whereConditions.length > 0
                ? `WHERE ${this.whereConditions.join(' AND ')}`
                : '';
            return `DELETE FROM ${this.tableName} ${where} RETURNING *`;
        }

        // UPSERT
        if (this.upsertData) {
            const columns = Object.keys(this.upsertData[0]).join(', ');
            const values = this.upsertData.map((row: any) => {
                const vals = Object.values(row).map(v =>
                    v === null ? 'NULL' : `'${this.escapeValue(v)}'`
                ).join(', ');
                return `(${vals})`;
            }).join(', ');
            const updateCols = Object.keys(this.upsertData[0])
                .filter(k => k !== this.onConflictColumn)
                .map(k => `${k} = EXCLUDED.${k}`)
                .join(', ');
            return `INSERT INTO ${this.tableName} (${columns}) VALUES ${values} ON CONFLICT (${this.onConflictColumn}) DO UPDATE SET ${updateCols} RETURNING *`;
        }

        // SELECT
        let sql = `SELECT ${this.selectColumns} FROM ${this.tableName}`;
        if (this.whereConditions.length > 0) {
            sql += ` WHERE ${this.whereConditions.join(' AND ')}`;
        }
        if (this.orderByClause) {
            sql += ` ${this.orderByClause}`;
        }
        if (this.limitCount !== null) {
            sql += ` LIMIT ${this.limitCount}`;
        }
        if (this.offsetCount !== null) {
            sql += ` OFFSET ${this.offsetCount}`;
        }
        return sql;
    }

    async execute(): Promise<QueryResult<T> | SingleResult<T>> {
        const sql = this.buildSQL();

        try {
            const response = await fetch(`${VECTABASE_URL}/api/database/query`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${VECTABASE_KEY}`,
                },
                body: JSON.stringify({ sql }),
            });

            const result = await response.json();

            if (!response.ok || result.error) {
                return {
                    data: null,
                    error: { message: result.error || 'Unknown error', details: result.detail },
                };
            }

            if (this.isSingleResult) {
                return {
                    data: result.rows?.[0] || null,
                    error: null,
                };
            }

            return {
                data: result.rows || [],
                error: null,
                count: result.rowCount,
            };
        } catch (error: any) {
            return {
                data: null,
                error: { message: error.message || 'Network error' },
            };
        }
    }

    then<TResult1 = QueryResult<T>, TResult2 = never>(
        onfulfilled?: ((value: QueryResult<T>) => TResult1 | PromiseLike<TResult1>) | undefined | null,
        onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null
    ): Promise<TResult1 | TResult2> {
        return this.execute().then(onfulfilled as any, onrejected);
    }
}

class VectabaseClient {
    from<T = any>(table: string): VectabaseQueryBuilder<T> {
        return new VectabaseQueryBuilder<T>(table);
    }

    // RPC calls (stored procedures)
    async rpc<T = any>(fnName: string, params?: any): Promise<QueryResult<T>> {
        const paramList = params
            ? Object.entries(params).map(([k, v]) => `${k} := '${v}'`).join(', ')
            : '';
        const sql = `SELECT * FROM ${fnName}(${paramList})`;

        try {
            const response = await fetch(`${VECTABASE_URL}/api/database/query`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${VECTABASE_KEY}`,
                },
                body: JSON.stringify({ sql }),
            });

            const result = await response.json();

            if (!response.ok || result.error) {
                return { data: null, error: { message: result.error } };
            }

            return { data: result.rows, error: null };
        } catch (error: any) {
            return { data: null, error: { message: error.message } };
        }
    }
}

export const vectabase = new VectabaseClient();
export default vectabase;
