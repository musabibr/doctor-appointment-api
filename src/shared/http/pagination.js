const MAX_LIMIT = 50;

const parsePagination = (query, { defaultLimit = 10 } = {}) => {
    const page = Math.max(1, parseInt(query.page, 10) || 1);
    const limit = Math.min(MAX_LIMIT, Math.max(1, parseInt(query.limit, 10) || defaultLimit));
    return { page, limit, skip: (page - 1) * limit };
};

const paginated = (items, total, { page, limit }) => ({
    items,
    total,
    page,
    limit,
    pages: Math.max(1, Math.ceil(total / limit)),
});

module.exports = { parsePagination, paginated };
