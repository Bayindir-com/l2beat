import { AztecConnectTransactionApi } from '@l2beat/config'
import { HttpClient, Logger, ProjectId } from '@l2beat/shared'
import { range } from 'lodash'

import { Metrics } from '../../../Metrics'
import { AztecConnectClient } from '../../../peripherals/aztec'
import { BlockTransactionCountRepository } from '../../../peripherals/database/activity/BlockTransactionCountRepository'
import { SequenceProcessorRepository } from '../../../peripherals/database/SequenceProcessorRepository'
import { promiseAllPlus } from '../../queue/promiseAllPlus'
import { SequenceProcessor } from '../../SequenceProcessor'
import { TransactionCounter } from '../TransactionCounter'
import { createBlockTransactionCounter } from './BlockTransactionCounter'
import { getBatchSizeFromCallsPerMinute } from './getBatchSizeFromCallsPerMinute'

export function createAztecConnectCounter(
  projectId: ProjectId,
  blockRepository: BlockTransactionCountRepository,
  http: HttpClient,
  sequenceProcessorRepository: SequenceProcessorRepository,
  logger: Logger,
  metrics: Metrics,
  options: AztecConnectTransactionApi,
): TransactionCounter {
  const callsPerMinute = options.callsPerMinute ?? 60
  const batchSize = getBatchSizeFromCallsPerMinute(callsPerMinute)
  const client = new AztecConnectClient(http, options.url, callsPerMinute)

  const processor = new SequenceProcessor(
    projectId.toString(),
    logger,
    metrics,
    sequenceProcessorRepository,
    {
      batchSize,
      startFrom: 0,
      getLatest: async () => {
        const block = await client.getLatestBlock()
        return block.number
      },
      processRange: async (from, to, trx, logger) => {
        const queries = range(from, to + 1).map((blockNumber) => async () => {
          const block = await client.getBlock(blockNumber)

          return {
            projectId,
            blockNumber: block.number,
            count: block.transactionCount,
            timestamp: block.timestamp,
          }
        })

        const blocks = await promiseAllPlus(queries, logger)
        await blockRepository.addMany(blocks, trx)
      },
    },
  )

  return createBlockTransactionCounter(projectId, processor, blockRepository)
}
