// eslint-disable-next-line import/no-extraneous-dependencies
import mongoose from 'mongoose'

// https://github.com/aravindnc/mongoose-paginate-v2
import mongoosePaginate from 'mongoose-paginate-v2'

const scooterSchema = new mongoose.Schema({
  vin: { type: String },
  mdbSn: { type: String },
  dbcSn: { type: String },
})

scooterSchema.plugin(mongoosePaginate)

const scooterModel = mongoose.model('ScooterModel', scooterSchema)

const getPaginatedScooters = async(query = { page: 1, limit: 20 /** service limit */ }) => {
  const options = {
    page: query.page,
    limit: query.limit,
    sort: {
      _id: 'asc',
    },
    customLabels: {
      docs: 'data',
      meta: 'pagination',
    },
  }

  const paginatedData = await scooterModel.paginate({}, options)
  /**
   * paginatedData = {
       data: [] // results,
       pagination: {
        page: Number,
        limit: Number,
        totalDocs: Number,
        totalPages: Number,
        hasNextPage: Boolean,
        nextPage: Number,
        hasPrevPage: Boolean,
        prevPage: Number,
        pagingCounter: Number
       }
   * }
   */
  return paginatedData
}

export default {
  getPaginatedScooters,
}
