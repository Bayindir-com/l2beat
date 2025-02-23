import { Logger, UnixTime } from '@l2beat/shared'
import { setTimeout } from 'timers/promises'

import { Metrics } from '../Metrics'
import { BlockNumberRepository } from '../peripherals/database/BlockNumberRepository'
import { EtherscanClient } from '../peripherals/etherscan'
import { Clock } from './Clock'
import { TaskQueue } from './queue/TaskQueue'

export class BlockNumberUpdater {
  private readonly blocksByTimestamp = new Map<number, number>()
  private readonly taskQueue: TaskQueue<UnixTime>

  constructor(
    private readonly etherscanClient: EtherscanClient,
    private readonly blockNumberRepository: BlockNumberRepository,
    private readonly clock: Clock,
    private readonly logger: Logger,
    metrics: Metrics,
  ) {
    this.logger = this.logger.for(this)
    this.taskQueue = new TaskQueue(
      (timestamp) => this.update(timestamp),
      this.logger.for('taskQueue'),
      {
        metrics: metrics.forTvl(this),
      },
    )
  }

  async getBlockNumberWhenReady(timestamp: UnixTime, refreshIntervalMs = 1000) {
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    while (true) {
      const blockNumber = this.blocksByTimestamp.get(timestamp.toNumber())
      if (blockNumber !== undefined) {
        return blockNumber
      }
      this.logger.debug('Something is waiting for getBlockNumberWhenReady', {
        timestamp: timestamp.toString(),
      })
      await setTimeout(refreshIntervalMs)
    }
  }

  async getBlockRangeWhenReady(
    from: UnixTime,
    to: UnixTime,
    refreshIntervalMs = 1000,
  ): Promise<{ timestamp: UnixTime; blockNumber: number }[]> {
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    while (true) {
      const blocks: { timestamp: UnixTime; blockNumber: number }[] = []
      let noHoles = true
      for (let t = from; t.lte(to); t = t.add(1, 'hours')) {
        const blockNumber = this.blocksByTimestamp.get(t.toNumber())
        if (blockNumber !== undefined) {
          blocks.push({
            timestamp: t,
            blockNumber,
          })
        } else {
          noHoles = false
          break
        }
      }
      if (noHoles) {
        return blocks
      } else {
        this.logger.debug('Something is waiting for getBlockRangeWhenReady', {
          from: from.toString(),
          to: to.toString(),
        })
        await setTimeout(refreshIntervalMs)
      }
    }
  }

  async start() {
    const known = await this.blockNumberRepository.getAll()
    for (const { timestamp, blockNumber } of known) {
      this.blocksByTimestamp.set(timestamp.toNumber(), blockNumber)
    }

    this.logger.info('Started')
    return this.clock.onEveryHour((timestamp) => {
      if (!this.blocksByTimestamp.has(timestamp.toNumber())) {
        // we add to front to sync from newest to oldest
        this.taskQueue.addToFront(timestamp)
      }
    })
  }

  async update(timestamp: UnixTime) {
    this.logger.debug('Update started', { timestamp: timestamp.toNumber() })
    const blockNumber = await this.etherscanClient.getBlockNumberAtOrBefore(
      timestamp,
    )
    const block = { timestamp, blockNumber }
    await this.blockNumberRepository.add(block)
    this.blocksByTimestamp.set(timestamp.toNumber(), blockNumber)
    this.logger.info('Update completed', {
      blockNumber: Number(blockNumber),
      timestamp: timestamp.toNumber(),
    })
  }
}
