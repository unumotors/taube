import Joi from 'joi'

const schemas = {}

schemas.paginationResponseSchema = Joi.object().keys({
  data: Joi.array().items(),
  pagination: Joi.object().keys({
    page: Joi.number().required(),
    limit: Joi.number().required(),
    totalDocs: Joi.number().required(),
    totalPages: Joi.number().required(),
    hasNextPage: Joi.boolean().required(),
    nextPage: Joi.number().required().allow(null),
    hasPrevPage: Joi.boolean().required(),
    prevPage: Joi.number().required().allow(null),
    pagingCounter: Joi.number().required(),
  }),
})

schemas.paginationRequestOptionsSchema = {
  page: Joi.number(),
  limit: Joi.number(),
}

export default schemas
