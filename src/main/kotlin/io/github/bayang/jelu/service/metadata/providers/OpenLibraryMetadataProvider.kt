package io.github.bayang.jelu.service.metadata.providers

import com.fasterxml.jackson.databind.JsonNode
import com.fasterxml.jackson.databind.ObjectMapper
import io.github.bayang.jelu.dto.MetadataDto
import io.github.bayang.jelu.dto.MetadataRequestDto
import io.github.oshai.kotlinlogging.KotlinLogging
import jakarta.annotation.Resource
import org.springframework.stereotype.Service
import org.springframework.web.client.RestClient
import java.util.Optional

private val logger = KotlinLogging.logger {}

@Service
class OpenLibraryMetadataProvider(
    @Resource(name = "springRestClient") private val restClient: RestClient,
    private val objectMapper: ObjectMapper,
) : IMetaDataProvider {
    private val name = "openlibrary"

    override fun name(): String = name

    override fun fetchMetadata(
        metadataRequestDto: MetadataRequestDto,
        config: Map<String, String>,
    ): Optional<MetadataDto> {
        if (!metadataRequestDto.isbn.isNullOrBlank()) {
            return searchByIsbn(metadataRequestDto.isbn)
        }
        return searchByTitleAndAuthor(metadataRequestDto.title, metadataRequestDto.authors)
    }

    private fun searchByIsbn(isbn: String): Optional<MetadataDto> {
        val cleanIsbn = isbn.replace("-", "", true)
        val start = System.currentTimeMillis()
        val response: String? =
            try {
                restClient
                    .get()
                    .uri("https://openlibrary.org/isbn/$cleanIsbn.json")
                    .retrieve()
                    .body(String::class.java)
            } catch (e: Exception) {
                logger.info { "openlibrary isbn-search $isbn: not found (${e.message})" }
                return Optional.empty()
            }

        val elapsed = System.currentTimeMillis() - start
        val hasResult = response != null && response.isNotBlank()
        logger.info { "openlibrary isbn-search $isbn: hasResult=$hasResult (${elapsed}ms)" }
        if (response == null || response.isBlank()) {
            return Optional.empty()
        }

        try {
            val root = objectMapper.readTree(response)
            val dto = parseBookFromWork(root)
            resolveFromJscmdData(cleanIsbn, dto)
            return Optional.of(dto)
        } catch (e: Exception) {
            logger.error(e) { "failed to parse OpenLibrary response for isbn $isbn" }
            return Optional.empty()
        }
    }

    private fun searchByTitleAndAuthor(
        title: String?,
        authors: String?,
    ): Optional<MetadataDto> {
        val query = listOfNotNull(title, authors).joinToString(" ")
        if (query.isBlank()) return Optional.empty()

        val response: String? =
            restClient
                .get()
                .uri {
                    it
                        .scheme("https")
                        .host("openlibrary.org")
                        .path("/search.json")
                        .queryParam("q", query)
                        .queryParam("limit", 1)
                        .build()
                }.retrieve()
                .body(String::class.java)

        if (response == null || response.isBlank()) {
            return Optional.empty()
        }

        try {
            val root = objectMapper.readTree(response)
            val docs = root.get("docs")
            if (docs == null || !docs.isArray || docs.isEmpty) {
                return Optional.empty()
            }
            val first = docs[0]
            val dto =
                MetadataDto(
                    title = first.get("title")?.asText(),
                    authors = extractAuthors(first),
                    publishedDate = first.get("first_publish_year")?.asText(),
                )
            val coverId = first.get("cover_i")?.asInt()
            if (coverId != null) {
                dto.image = "https://covers.openlibrary.org/b/id/$coverId-M.jpg"
            }
            val editionKey = first.get("cover_edition_key")?.asText()
            if (editionKey != null) {
                try {
                    enrichFromEdition(editionKey, dto)
                } catch (_: Exception) {
                    // non-critical, search result already has basic fields
                }
            }
            return Optional.of(dto)
        } catch (e: Exception) {
            logger.error(e) { "failed to parse OpenLibrary search response" }
            return Optional.empty()
        }
    }

    fun searchByTitleAndAuthorMulti(
        title: String?,
        authors: String?,
    ): List<MetadataDto> {
        val query = listOfNotNull(title, authors).joinToString(" ")
        if (query.isBlank()) return emptyList()

        val response: String? =
            restClient
                .get()
                .uri {
                    it
                        .scheme("https")
                        .host("openlibrary.org")
                        .path("/search.json")
                        .queryParam("q", query)
                        .queryParam("limit", 10)
                        .build()
                }.retrieve()
                .body(String::class.java)

        if (response == null || response.isBlank()) {
            return emptyList()
        }

        try {
            val root = objectMapper.readTree(response)
            val docs = root.get("docs")
            if (docs == null || !docs.isArray || docs.isEmpty) {
                return emptyList()
            }
            return docs.mapNotNull { doc ->
                try {
                    val dto =
                        MetadataDto(
                            title = doc.get("title")?.asText(),
                            authors = extractAuthors(doc),
                            publishedDate = doc.get("first_publish_year")?.asText(),
                            publisher = doc.get("publisher")?.firstOrNull()?.asText(),
                            pageCount = doc.get("number_of_pages_median")?.asInt(),
                        )
                    val coverId = doc.get("cover_i")?.asInt()
                    if (coverId != null) {
                        dto.image = "https://covers.openlibrary.org/b/id/$coverId-M.jpg"
                    }
                    val isbn10 = doc.get("isbn")?.firstOrNull()?.asText()
                    val isbn13 = doc.get("isbn_13")?.firstOrNull()?.asText()
                    if (isbn10 != null) dto.isbn10 = isbn10
                    if (isbn13 != null) dto.isbn13 = isbn13
                    dto
                } catch (e: Exception) {
                    logger.warn { "failed to parse doc: ${e.message}" }
                    null
                }
            }
        } catch (e: Exception) {
            logger.error(e) { "failed to parse OpenLibrary search response" }
            return emptyList()
        }
    }

    override fun searchMetadata(
        metadataRequestDto: MetadataRequestDto,
        config: Map<String, String>,
    ): List<MetadataDto> {
        if (!metadataRequestDto.isbn.isNullOrBlank()) {
            val result = searchByIsbn(metadataRequestDto.isbn)
            return if (result.isPresent) listOf(result.get()) else emptyList()
        }
        return searchByTitleAndAuthorMulti(metadataRequestDto.title, metadataRequestDto.authors)
    }

    private fun enrichFromEdition(
        editionKey: String,
        dto: MetadataDto,
    ) {
        val response: String? =
            try {
                restClient
                    .get()
                    .uri("https://openlibrary.org/books/$editionKey.json")
                    .retrieve()
                    .body(String::class.java)
            } catch (e: Exception) {
                logger.info { "openlibrary edition $editionKey: not found" }
                return
            }

        if (response == null || response.isBlank()) return

        val root = objectMapper.readTree(response)
        val workData = parseBookFromWork(root)
        if (dto.title == null) dto.title = workData.title
        if (dto.summary == null) dto.summary = workData.summary
        if (dto.publisher == null) dto.publisher = workData.publisher
        if (dto.pageCount == null) dto.pageCount = workData.pageCount
        if (dto.publishedDate == null) dto.publishedDate = workData.publishedDate
        if (dto.image == null) dto.image = workData.image
        if (dto.language == null) dto.language = workData.language
        dto.tags.addAll(workData.tags)
    }

    private fun parseBookFromWork(node: JsonNode): MetadataDto {
        val dto = MetadataDto()
        dto.title = node.get("title")?.asText()

        val desc = node.get("description")
        dto.summary =
            when {
                desc == null -> null
                desc.isTextual -> desc.asText()
                desc.isObject -> desc.get("value")?.asText()
                else -> null
            }

        val isbn10 = node.get("isbn_10")?.asText()
        if (isbn10 != null) dto.isbn10 = isbn10
        val isbn13 = node.get("isbn_13")?.asText()
        if (isbn13 != null) dto.isbn13 = isbn13

        val publishers = node.get("publishers")
        if (publishers != null && publishers.isArray && !publishers.isEmpty) {
            // OpenLibrary returns either ["Publisher Name"] or [{"name": "Publisher Name"}]
            val firstPublisher = publishers[0]
            dto.publisher = if (firstPublisher.isObject) {
                firstPublisher.get("name")?.asText()
            } else {
                firstPublisher.asText()
            }
        }
        dto.publishedDate = node.get("publish_date")?.asText()
        dto.pageCount = node.get("number_of_pages")?.asInt()
        dto.language =
            node
                .get("languages")
                ?.get(0)
                ?.get("key")
                ?.asText()
                ?.removePrefix("/languages/")

        val olKey = node.get("key")?.asText()
        if (olKey != null) dto.openlibraryId = olKey.removePrefix("/books/")

        val coverIds = node.get("covers")
        if (coverIds != null && coverIds.isArray && !coverIds.isEmpty) {
            dto.image = "https://covers.openlibrary.org/b/id/${coverIds[0].asText()}-M.jpg"
        }

        val subjects = node.get("subjects")
        if (subjects != null && subjects.isArray) {
            dto.tags = subjects.mapNotNull { it.asText() }.toMutableSet()
        }

        return dto
    }

    private fun resolveFromJscmdData(
        isbn: String,
        dto: MetadataDto,
    ) {
        try {
            val jscmdResponse: String? =
                restClient
                    .get()
                    .uri {
                        it
                            .scheme("https")
                            .host("openlibrary.org")
                            .path("/api/books")
                            .queryParam("bibkeys", "ISBN:$isbn")
                            .queryParam("format", "json")
                            .queryParam("jscmd", "data")
                            .build()
                    }.retrieve()
                    .body(String::class.java)

            if (jscmdResponse == null || jscmdResponse.isBlank()) return
            val root = objectMapper.readTree(jscmdResponse)
            val bookNode = root.get("ISBN:$isbn") ?: return
            val resolvedAuthors = extractAuthors(bookNode)
            if (resolvedAuthors.isNotEmpty()) {
                dto.authors = resolvedAuthors
            }
            if (dto.publisher == null) {
                val publishers = bookNode.get("publishers")
                if (publishers != null && publishers.isArray && !publishers.isEmpty) {
                    val firstPublisher = publishers[0]
                    dto.publisher = if (firstPublisher.isObject) {
                        firstPublisher.get("name")?.asText()
                    } else {
                        firstPublisher.asText()
                    }
                }
            }
            if (dto.pageCount == null) {
                dto.pageCount = bookNode.get("number_of_pages")?.asInt()
            }
            if (dto.publishedDate == null) {
                dto.publishedDate = bookNode.get("publish_date")?.asText()
            }
            if (dto.image == null) {
                val cover = bookNode.get("cover")
                if (cover != null) {
                    dto.image = cover.get("medium")?.asText() ?: cover.get("small")?.asText()
                }
            }
        } catch (e: Exception) {
            logger.warn(e) { "failed to resolve author names from jscmd" }
        }
    }

    private fun extractAuthors(node: JsonNode): MutableSet<String> {
        val authors = node.get("authors")
        if (authors != null && authors.isArray) {
            return authors.mapNotNull { it.get("name")?.asText() }.toMutableSet()
        }
        val authorNames = node.get("author_name")
        if (authorNames != null && authorNames.isArray) {
            return authorNames.mapNotNull { it.asText() }.toMutableSet()
        }
        return mutableSetOf()
    }
}
