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
        val response: String? =
            restClient
                .get()
                .uri {
                    it
                        .scheme("https")
                        .host("openlibrary.org")
                        .path("/api/books")
                        .queryParam("bibkeys", "ISBN:$cleanIsbn")
                        .queryParam("format", "json")
                        .queryParam("jscmd", "data")
                        .build()
                }
                .retrieve()
                .body(String::class.java)

        if (response == null || response.isBlank() || response == "{}") {
            return Optional.empty()
        }

        try {
            val root = objectMapper.readTree(response)
            val bookKey = "ISBN:$cleanIsbn"
            val bookNode = root.get(bookKey) ?: return Optional.empty()
            return Optional.of(parseBook(bookNode))
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
                }
                .retrieve()
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

    private fun enrichFromEdition(
        editionKey: String,
        dto: MetadataDto,
    ) {
        val response: String? =
            restClient
                .get()
                .uri {
                    it
                        .scheme("https")
                        .host("openlibrary.org")
                        .path("/api/books")
                        .queryParam("bibkeys", "OLID:$editionKey")
                        .queryParam("format", "json")
                        .queryParam("jscmd", "data")
                        .build()
                }
                .retrieve()
                .body(String::class.java)

        if (response == null || response.isBlank() || response == "{}") return

        val root = objectMapper.readTree(response)
        val bookNode = root.get("OLID:$editionKey") ?: return
        parseBookInto(bookNode, dto)
    }

    private fun parseBook(node: JsonNode): MetadataDto {
        val dto = MetadataDto()
        parseBookInto(node, dto)
        return dto
    }

    private fun parseBookInto(
        node: JsonNode,
        dto: MetadataDto,
    ) {
        dto.title = buildTitle(node)
        dto.authors = extractAuthors(node)

        val identifiers = node.get("identifiers")
        if (identifiers != null) {
            val isbn10 = identifiers.get("isbn_10")?.get(0)?.asText()
            if (isbn10 != null) dto.isbn10 = isbn10
            val isbn13 = identifiers.get("isbn_13")?.get(0)?.asText()
            if (isbn13 != null) dto.isbn13 = isbn13
            val olId = identifiers.get("openlibrary")?.get(0)?.asText()
            if (olId != null) dto.openlibraryId = olId
        }

        val publishers = node.get("publishers")
        if (publishers != null && publishers.isArray && !publishers.isEmpty) {
            dto.publisher = publishers[0].get("name")?.asText()
        }

        dto.publishedDate = node.get("publish_date")?.asText()
        dto.pageCount = node.get("number_of_pages")?.asInt()

        val subjects = node.get("subjects")
        if (subjects != null && subjects.isArray) {
            dto.tags =
                subjects.mapNotNull { it.get("name")?.asText() }.toMutableSet()
        }

        val cover = node.get("cover")
        if (cover != null) {
            dto.image = cover.get("medium")?.asText() ?: cover.get("large")?.asText()
        }
    }

    private fun buildTitle(node: JsonNode): String? {
        val title = node.get("title")?.asText() ?: return null
        val subtitle = node.get("subtitle")?.asText()
        return if (subtitle != null) "$title: $subtitle" else title
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
