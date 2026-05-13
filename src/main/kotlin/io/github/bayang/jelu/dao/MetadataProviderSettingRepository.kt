package io.github.bayang.jelu.dao

import io.github.bayang.jelu.dto.MetadataProviderSettingDto
import org.jetbrains.exposed.sql.*
import org.jetbrains.exposed.sql.transactions.transaction
import org.springframework.stereotype.Repository

object MetadataProviderSettingTable : Table("metadata_provider_setting") {
    val name: Column<String> = varchar("name", 200)
    val isEnabled: Column<Boolean> = bool("is_enabled")
    val providerOrder: Column<Int> = integer("provider_order")
    val apiKey: Column<String?> = varchar("api_key", 500).nullable()
    val config: Column<String?> = varchar("config", 5000).nullable()

    override val primaryKey = PrimaryKey(name)
}

@Repository
class MetadataProviderSettingRepository {
    fun findAll(): List<MetadataProviderSettingDto> =
        transaction {
            MetadataProviderSettingTable
                .selectAll()
                .orderBy(MetadataProviderSettingTable.providerOrder to SortOrder.DESC)
                .map { it.toDto() }
        }

    fun saveAll(settings: List<MetadataProviderSettingDto>) =
        transaction {
            MetadataProviderSettingTable.deleteAll()
            settings.forEach { setting ->
                MetadataProviderSettingTable.insert {
                    it[name] = setting.name
                    it[isEnabled] = setting.isEnabled
                    it[providerOrder] = setting.order
                    it[apiKey] = setting.apiKey
                    it[config] = setting.config
                }
            }
        }

    private fun ResultRow.toDto() =
        MetadataProviderSettingDto(
            name = this[MetadataProviderSettingTable.name],
            isEnabled = this[MetadataProviderSettingTable.isEnabled],
            order = this[MetadataProviderSettingTable.providerOrder],
            apiKey = this[MetadataProviderSettingTable.apiKey],
            config = this[MetadataProviderSettingTable.config],
        )
}
