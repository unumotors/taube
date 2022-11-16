import taube from '../../lib/index.js'

import service from './service.js'

taube.http.init()

const client = new taube.Client({ uri: 'http://scooter' })
const server = new taube.Server({})

// Server
server.paginate(
  '/scooters',
  async(req) => {
    const response = await service.getPaginatedScooters(req.query) // req.query = { page, limit }
    return response
  },
)

// Client
async function getScooters(pagination) {
  const response = await client.paginate('/scooters', { pagination })
  /** The response Object will be formatted to the below representation by the Server component
   * response = {
   * data : [],
   * pagination : {
    *  page: Number,
        limit: Number,
        totalDocs: Number,
        totalPages: Number,
        hasNextPage: Boolean,
        nextPage: Number,
        hasPrevPage: Boolean,
        prevPage: Number
      }
   * }
   */
  return response
}

getScooters({ page: 2, limit: 10 }).catch((err) => console.log(err))
