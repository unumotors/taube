import taube, { Server, Joi } from '../../lib/index.js'

const server = new Server({})
taube.http.init()

server.get(
  '/scooters/:id',
  {
    params: Joi.object().keys({
      id: Joi.string().required(),
    }),
  },
  async(req) => {
    const { id } = req.params
    const { type } = req.query
    const response = await new Promise((resolve) => {
      resolve({ id, type })
    }) // do something
    return response
  },
)

server.post(
  '/scooters',
  {
    body: Joi.object().keys({
      vin: Joi.string().required(),
    }),
  },
  async(req) => {
    const { vin } = req.body
    const response = await new Promise((resolve) => { resolve(vin) }) // do something
    return response
  },
)

server.put(
  '/scooters/:id',
  {
    body: Joi.object().keys({
      online: Joi.boolean(),
    }),
    params: Joi.object().keys({
      id: Joi.string().required(),
    }),
  },
  async(req) => {
    const { id } = req.params
    const { online } = req.body
    const response = await new Promise((resolve) => { resolve({ id, online }) }) // do something
    return response
  },
)

server.delete(
  '/scooters/:id',
  {
    params: Joi.object().keys({
      id: Joi.string().required(),
    }),
  },
  async(req) => {
    const { id } = req.params
    const response = await new Promise((resolve) => { resolve(id) }) // do something
    return response
  },
)
