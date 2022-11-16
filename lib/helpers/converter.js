export const escape = (value) => global.escape(value.split(' ').join('-'))

export default escape
