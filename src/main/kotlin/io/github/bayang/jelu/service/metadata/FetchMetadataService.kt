package io.github.bayang.jelu.service.metadata

import io.github.bayang.jelu.dto.MetadataDto
import io.github.bayang.jelu.dto.MetadataRequestDto
import io.github.bayang.jelu.service.metadata.providers.IMetaDataProvider
import io.github.bayang.jelu.utils.PluginInfoComparator
import io.github.oshai.kotlinlogging.KotlinLogging
import org.springframework.stereotype.Service
import java.util.Optional

private val logger = KotlinLogging.logger {}

@Service
class FetchMetadataService(
    private val providers: List<IMetaDataProvider>,
    private val pluginInfoHolder: PluginInfoHolder,
) {
    fun fetchMetadata(
        metadataRequestDto: MetadataRequestDto,
        config: Map<String, String> = mapOf(),
    ): MetadataDto {
        var pluginsToUse = if (metadataRequestDto.plugins.isNullOrEmpty()) pluginInfoHolder.plugins() else metadataRequestDto.plugins
        pluginsToUse = pluginsToUse.toMutableList()
        pluginsToUse.sortWith(PluginInfoComparator)
        logger.trace { "plugins to use : $pluginsToUse" }
        logger.info { "plugins selected: ${pluginsToUse.joinToString { "${it.name}(${it.order})" }}" }
        val hasExactIsbn = !metadataRequestDto.isbn.isNullOrBlank()
        val merged = MetadataDto()
        for (plugin in pluginsToUse) {
            logger.trace { "fetching provider for plugin ${plugin.name} with order ${plugin.order} " }
            val provider = providers.find { plugin.name.equals(it.name(), true) }
            if (provider != null) {
                val start = System.currentTimeMillis()
                val res: Optional<MetadataDto>? =
                    try {
                        provider.fetchMetadata(metadataRequestDto, config)
                    } catch (e: Exception) {
                        logger.warn { "provider ${plugin.name} failed: ${e.message}" }
                        null
                    }
                val elapsed = System.currentTimeMillis() - start
                val resultStatus =
                    if (res != null && res.isPresent) {
                        "OK (title=${res.get().title}, isbn13=${res.get().isbn13})"
                    } else {
                        "empty"
                    }
                logger.info { "provider ${plugin.name}: $resultStatus (${elapsed}ms)" }
                if (res != null && res.isPresent) {
                    if (hasExactIsbn) {
                        mergeInto(merged, res.get())
                    } else {
                        return res.get()
                    }
                }
            } else {
                logger.warn { "could not find provider for plugin info ${plugin.name}" }
            }
        }
        val result = if (hasData(merged)) merged else MetadataDto()
        logger.info {
            "fetchMetadata done: hasData=${hasData(merged)}, " +
                "providers=${pluginsToUse.size}, title=${result.title}, isbn13=${result.isbn13}"
        }
        return result
    }

    private fun mergeInto(
        acc: MetadataDto,
        next: MetadataDto,
    ) {
        if (acc.title == null) acc.title = next.title
        if (acc.isbn10 == null) acc.isbn10 = next.isbn10
        if (acc.isbn13 == null) acc.isbn13 = next.isbn13
        if (acc.summary == null) acc.summary = next.summary
        if (acc.image == null) acc.image = next.image
        if (acc.publisher == null) acc.publisher = next.publisher
        if (acc.pageCount == null) acc.pageCount = next.pageCount
        if (acc.publishedDate == null) acc.publishedDate = next.publishedDate
        if (acc.series == null) acc.series = next.series
        if (acc.numberInSeries == null) acc.numberInSeries = next.numberInSeries
        if (acc.language == null) acc.language = next.language
        if (acc.googleId == null) acc.googleId = next.googleId
        if (acc.amazonId == null) acc.amazonId = next.amazonId
        if (acc.goodreadsId == null) acc.goodreadsId = next.goodreadsId
        if (acc.librarythingId == null) acc.librarythingId = next.librarythingId
        if (acc.isfdbId == null) acc.isfdbId = next.isfdbId
        if (acc.openlibraryId == null) acc.openlibraryId = next.openlibraryId
        if (acc.inventaireId == null) acc.inventaireId = next.inventaireId
        if (acc.noosfereId == null) acc.noosfereId = next.noosfereId
        acc.authors.addAll(next.authors)
        acc.tags.addAll(next.tags)
    }

    private fun hasData(dto: MetadataDto): Boolean = dto.title != null || dto.isbn10 != null || dto.isbn13 != null
}
