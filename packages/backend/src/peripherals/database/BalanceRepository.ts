import { AssetId, EthereumAddress, Logger, UnixTime } from '@l2beat/shared'
import { BalanceRow } from 'knex/types/tables'

import { Metrics } from '../../Metrics'
import { BaseRepository, CheckConvention } from './shared/BaseRepository'
import { Database } from './shared/Database'

export interface BalanceRecord {
  timestamp: UnixTime
  holderAddress: EthereumAddress
  assetId: AssetId
  balance: bigint
}

export interface DataBoundary {
  earliestBlockNumber: bigint | undefined
  latestBlockNumber: bigint | undefined
}

export class BalanceRepository extends BaseRepository {
  constructor(database: Database, logger: Logger, metrics: Metrics) {
    super(database, logger, metrics)
    this.autoWrap<CheckConvention<BalanceRepository>>(this)
  }

  async getByTimestamp(timestamp: UnixTime): Promise<BalanceRecord[]> {
    const knex = await this.knex()
    const rows = await knex('asset_balances').where({
      unix_timestamp: timestamp.toDate(),
    })

    return rows.map(toRecord)
  }

  async getByHolderAndAsset(
    holder: EthereumAddress,
    asset: AssetId,
  ): Promise<BalanceRecord[]> {
    const knex = await this.knex()
    const rows = await knex
      .from('asset_balances')
      .where('holder_address', holder.toString())
      .where('asset_id', asset.toString())

    return rows.map(toRecord)
  }

  async addOrUpdateMany(balances: BalanceRecord[]) {
    const rows = balances.map(toRow)
    const knex = await this.knex()
    await knex('asset_balances')
      .insert(rows)
      .onConflict(['unix_timestamp', 'holder_address', 'asset_id'])
      .merge()
    return rows.length
  }

  async getAll(): Promise<BalanceRecord[]> {
    const knex = await this.knex()
    const rows = await knex('asset_balances')
    return rows.map(toRecord)
  }

  async deleteAll() {
    const knex = await this.knex()
    return await knex('asset_balances').delete()
  }
}

function toRecord(row: BalanceRow): BalanceRecord {
  return {
    holderAddress: EthereumAddress(row.holder_address),
    assetId: AssetId(row.asset_id),
    timestamp: UnixTime.fromDate(row.unix_timestamp),
    balance: BigInt(row.balance),
  }
}

function toRow(record: BalanceRecord): BalanceRow {
  return {
    holder_address: record.holderAddress.toString(),
    asset_id: record.assetId.toString(),
    unix_timestamp: record.timestamp.toDate(),
    balance: record.balance.toString(),
  }
}
