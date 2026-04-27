package io.github.bayang.jelu.service.metadata.providers

import io.github.bayang.jelu.dto.MetadataDto
import io.github.bayang.jelu.dto.MetadataRequestDto
import org.jsoup.Jsoup
import org.jsoup.nodes.Document
import org.slf4j.LoggerFactory
import org.springframework.stereotype.Service
import java.util.Optional

@Service
class GoodreadsMetadataProvider : IMetaDataProvider {
    private val logger = LoggerFactory.getLogger(GoodreadsMetadataProvider::class.java)
    private val baseUrl = "https://www.goodreads.com"

    override fun name(): String = "goodreads"

    override fun fetchMetadata(
        metadataRequestDto: MetadataRequestDto,
        config: Map<String, String>,
    ): Optional<MetadataDto> {
        val isbn =
            metadataRequestDto.isbn
                ?.replace("-", "", true)
                ?.replace(" ", "", true)
        if (isbn.isNullOrBlank()) {
            return Optional.empty()
        }
        val bookUrl = searchByIsbn(isbn)
        if (bookUrl == null) {
            logger.debug("No Goodreads page found for isbn $isbn")
            return Optional.empty()
        }
        return parseBookPage(bookUrl)
    }

    private fun searchByIsbn(isbn: String): String? {
        // try direct URL first
        try {
            val directUrl = "$baseUrl/book/isbn/$isbn"
            val doc = fetchDocument(directUrl)
            if (doc != null && doc.selectFirst("h1[data-testid=bookTitle]") != null) {
                return directUrl
            }
        } catch (_: Exception) {
            // fallback to search
        }

        // search and follow first result
        try {
            val searchDoc = fetchDocument("$baseUrl/search?q=$isbn")
            if (searchDoc != null) {
                val link = searchDoc.selectFirst("a.bookTitle")?.attr("href")
                if (link != null) {
                    return "$baseUrl$link"
                }
            }
        } catch (_: Exception) {
        }
        return null
    }

    private fun parseBookPage(url: String): Optional<MetadataDto> {
        val doc = fetchDocument(url) ?: return Optional.empty()
        val dto = MetadataDto()

        // title
        doc.selectFirst("h1[data-testid=bookTitle]")?.text()?.let { dto.title = it }
        if (dto.title == null) {
            doc.selectFirst("h1#bookTitle")?.text()?.let { dto.title = it }
        }
        if (dto.title == null) {
            doc.select("meta[property=og:title]")?.attr("content")?.let { dto.title = it }
        }

        // authors
        val authors = mutableSetOf<String>()
        doc.select("span[data-testid=authorname] a").forEach { authors.add(it.text().trim()) }
        if (authors.isEmpty()) {
            doc.select("a.authorName span").forEach { authors.add(it.text().trim()) }
        }
        if (authors.isEmpty()) {
            doc.select("div#bookAuthors a[href*=/author/show/] span").forEach { authors.add(it.text().trim()) }
        }
        dto.authors = authors

        // summary
        doc.selectFirst("div[data-testid=description] span[role=none]")?.text()?.let {
            dto.summary = it.trim()
        }
        if (dto.summary == null) {
            doc.selectFirst("#description span[style*='none']")?.text()?.let {
                dto.summary = it.trim()
            }
        }
        if (dto.summary == null) {
            doc.selectFirst("div#description span")?.text()?.let {
                dto.summary = it.trim()
            }
        }

        // image
        doc.selectFirst("img.ResponsiveImage")?.attr("src")?.let { dto.image = it }
        if (dto.image == null) {
            doc.select("meta[property=og:image]")?.attr("content")?.let { dto.image = it }
        }

        // details section: publisher, pageCount, publishedDate, isbn
        val detailElements = doc.select("div[data-testid=bookDetails] p")
        if (detailElements.isEmpty()) {
            doc.select("div#bookDetailsBox div.infoBoxRowItem").forEach { detailElements.add(it) }
        }
        for (div in detailElements) {
            val text = div.text()
            when {
                text.contains("Publisher", true) -> {
                    dto.publisher =
                        text
                            .replace("Publisher", "", true)
                            .replace(":", "")
                            .trim()
                }
                text.contains("Page", true) -> {
                    dto.pageCount = text.replace("[^0-9]".toRegex(), "").toIntOrNull()
                }
                text.contains("Published", true) -> {
                    dto.publishedDate = text.removePrefix("Published", true).trim()
                }
                text.contains("ISBN", true) -> {
                    val raw =
                        text
                            .removePrefix("ISBN", true)
                            .replace("-", "")
                            .replace(" ", "")
                            .trim()
                    when {
                        raw.length == 13 -> dto.isbn13 = raw
                        raw.length == 10 -> dto.isbn10 = raw
                    }
                }
            }
        }

        // tags (genres)
        val tags = mutableSetOf<String>()
        doc.select("a[data-testid=bookGenre]").forEach { tags.add(it.text().trim()) }
        if (tags.isEmpty()) {
            doc.select("a.bookPageGenreLink[href*=/genres/]").forEach { tags.add(it.text().trim()) }
        }
        dto.tags = tags

        if (dto.title.isNullOrBlank()) {
            logger.debug("Failed to parse Goodreads page $url – no title found")
            return Optional.empty()
        }
        return Optional.of(dto)
    }

    private fun fetchDocument(url: String): Document? {
        try {
            return Jsoup
                .connect(url)
                .userAgent("Mozilla/5.0 JeluBot")
                .timeout(10_000)
                .followRedirects(true)
                .get()
        } catch (e: Exception) {
            logger.debug("Failed to fetch $url: ${e.message}")
        }
        return null
    }

    private fun String.removePrefix(
        prefix: String,
        ignoreCase: Boolean = false,
    ): String {
        if (ignoreCase) {
            val idx = this.indexOf(prefix, 0, ignoreCase)
            return if (idx == 0) this.removePrefix(prefix) else this
        }
        return this.removePrefix(prefix)
    }
}
