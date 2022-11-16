import test from 'ava'
import { waitUntil } from './helper/util.js'

test.serial('should be able to wait until', async(t) => {
  t.plan(3)
  let count = 0
  await waitUntil(() => {
    count++
    t.pass()
    return count == 3
  })
})
