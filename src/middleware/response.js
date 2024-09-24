function response(res, code, status, message, data = null) {
    if (!data) {
        return res.status(code).json({
            status: status,
            message: message
        })
    }
    return res.status(code).json({
        status: status,
        message: message,
        data: data
    });
}

module.exports = response