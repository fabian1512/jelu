package io.github.bayang.jelu.service.metadata

import io.github.bayang.jelu.config.JeluProperties
import io.github.bayang.jelu.dao.MetadataProviderSettingRepository
import io.github.bayang.jelu.dto.MetadataProviderSettingDto
import io.github.bayang.jelu.dto.PluginInfo
import io.github.bayang.jelu.service.metadata.providers.IMetaDataProvider
import io.github.bayang.jelu.utils.PluginInfoComparator
import io.github.oshai.kotlinlogging.KotlinLogging
import org.springframework.stereotype.Service

private val logger = KotlinLogging.logger {}

@Service
class PluginInfoHolder(
    private val properties: JeluProperties,
    private val providers: List<IMetaDataProvider>,
    private val settingsRepository: MetadataProviderSettingRepository,
) {
    companion object {
        const val CALIBRE = "calibre"
        const val JELU_DEBUG = "jelu-debug"
    }

    private var pluginsList: List<PluginInfo> = listOf()
    private var pluginsComputed = false
    private var calibreComputed = false
    private var calibreEnabled = false

    fun plugins(): List<PluginInfo> {
        if (pluginsComputed) return pluginsList
        val pluginInfoList: List<PluginInfo>? =
            properties.metadataProviders
                ?.filter { it.isEnabled }
                ?.map { PluginInfo(name = it.name, order = it.order) }
                ?.toList()
        val plugins = mutableListOf<PluginInfo>()
        if (!pluginInfoList.isNullOrEmpty()) {
            plugins.addAll(pluginInfoList)
        }
        providers.forEach { provider ->
            val name = provider.name()
            if (name == CALIBRE) return@forEach
            if (name == JELU_DEBUG) return@forEach
            if (plugins.any { it.name.equals(name, true) }) return@forEach
            val order =
                when (name) {
                    "openlibrary" -> 30
                    "inventaireio" -> 20
                    "google" -> 10
                    "goodreads" -> 8
                    "databazeknih" -> 5
                    else -> 0
                }
            plugins.add(PluginInfo(name = name, order = order))
        }
        if (calibreEnabled()) {
            plugins.add(PluginInfo(name = CALIBRE, order = -100))
        }
        // override with DB settings
        val dbSettings = settingsRepository.findAll()
        for (setting in dbSettings) {
            val idx = plugins.indexOfFirst { it.name.equals(setting.name, true) }
            if (idx >= 0) {
                if (!setting.isEnabled) {
                    plugins.removeAt(idx)
                } else {
                    plugins[idx] = plugins[idx].copy(order = setting.order)
                }
            } else if (setting.isEnabled) {
                plugins.add(PluginInfo(name = setting.name, order = setting.order))
            }
        }
        plugins.sortWith(PluginInfoComparator)
        pluginsList = plugins
        pluginsComputed = true
        logger.info { "plugins(): ${plugins.size} providers: ${plugins.joinToString { "${it.name}(${it.order})" }}" }
        return pluginsList
    }

    fun getProviderSettings(): List<MetadataProviderSettingDto> {
        // merge auto-registered providers with DB settings
        val defaults =
            providers.mapNotNull { provider ->
                val name = provider.name()
                if (name == JELU_DEBUG) return@mapNotNull null
                val order =
                    when (name) {
                        "openlibrary" -> 30
                        "inventaireio" -> 20
                        "google" -> 10
                        "goodreads" -> 8
                        CALIBRE -> -100
                        "databazeknih" -> 5
                        else -> 0
                    }
                MetadataProviderSettingDto(name = name, isEnabled = true, order = order)
            }
        val dbSettings = settingsRepository.findAll()
        return defaults
            .map { default ->
                val dbSetting = dbSettings.find { it.name.equals(default.name, true) }
                dbSetting ?: default
            }.sortedByDescending { it.order }
    }

    fun updateProviderSettings(settings: List<MetadataProviderSettingDto>) {
        settingsRepository.saveAll(settings)
        refresh()
    }

    fun refresh() {
        pluginsComputed = false
    }

    fun calibreEnabled(): Boolean {
        if (calibreComputed) return calibreEnabled
        calibreEnabled =
            !properties.metadata.calibre.path
                .isNullOrEmpty()
        calibreComputed = true
        return calibreEnabled
    }
}
