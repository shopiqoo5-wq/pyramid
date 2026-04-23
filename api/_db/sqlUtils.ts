/**
 * Utils for converting between JS CamelCase and SQL SnakeCase
 */

export function toSnakeCase(str: string): string {
  return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
}

export function toCamelCase(str: string): string {
  return str.replace(/([-_][a-z])/g, (group) =>
    group.toUpperCase().replace('-', '').replace('_', '')
  );
}

export function keysToSnake(obj: any): any {
  if (obj === null || typeof obj !== 'object' || obj instanceof Date) return obj;
  if (Array.isArray(obj)) return obj.map(keysToSnake);

  return Object.keys(obj).reduce((acc, key) => {
    acc[toSnakeCase(key)] = keysToSnake(obj[key]);
    return acc;
  }, {} as any);
}

export function keysToCamel(obj: any): any {
  if (obj === null || typeof obj !== 'object' || obj instanceof Date) return obj;
  if (Array.isArray(obj)) return obj.map(keysToCamel);

  return Object.keys(obj).reduce((acc, key) => {
    acc[toCamelCase(key)] = keysToCamel(obj[key]);
    return acc;
  }, {} as any);
}

/**
 * Basic SQL Builder for generic CRUD
 */
export const SQL = {
  select(table: string, filters: Record<string, any> = {}) {
    const keys = Object.keys(filters).map(toSnakeCase);
    const values = Object.values(filters);
    const where = keys.length
      ? `WHERE ${keys.map((k, i) => `${k} = $${i + 1}`).join(' AND ')}`
      : '';
    return {
      text: `SELECT * FROM ${table} ${where} ORDER BY created_at DESC`,
      params: values,
    };
  },

  insert(table: string, data: Record<string, any>) {
    const snakeData = keysToSnake(data);
    delete snakeData.id;
    // Handle JSONB fields if they are objects
    for (const key in snakeData) {
      if (typeof snakeData[key] === 'object' && snakeData[key] !== null && !(snakeData[key] instanceof Date)) {
        snakeData[key] = JSON.stringify(snakeData[key]);
      }
    }
    const keys = Object.keys(snakeData);
    const values = Object.values(snakeData);
    const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
    return {
      text: `INSERT INTO ${table} (${keys.join(', ')}) VALUES (${placeholders}) RETURNING *`,
      params: values,
    };
  },

  update(table: string, id: string, data: Record<string, any>) {
    const snakeData = keysToSnake(data);
    delete snakeData.id;
    delete snakeData.created_at;
    snakeData.updated_at = new Date();
    
    // Handle JSONB fields
    for (const key in snakeData) {
      if (typeof snakeData[key] === 'object' && snakeData[key] !== null && !(snakeData[key] instanceof Date)) {
        snakeData[key] = JSON.stringify(snakeData[key]);
      }
    }

    const keys = Object.keys(snakeData);
    const values = Object.values(snakeData);
    const setClause = keys.map((k, i) => `${k} = $${i + 1}`).join(', ');
    return {
      text: `UPDATE ${table} SET ${setClause} WHERE id = $${keys.length + 1} RETURNING *`,
      params: [...values, id],
    };
  },

  delete(table: string, id: string) {
    return {
      text: `DELETE FROM ${table} WHERE id = $1`,
      params: [id],
    };
  },
};
