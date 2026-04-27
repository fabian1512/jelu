package io.github.bayang.jelu.service.metadata

import io.github.bayang.jelu.config.JeluProperties
import io.github.bayang.jelu.dto.PluginInfo
import io.github.bayang.jelu.service.metadata.providers.IMetaDataProvider
import io.github.bayang.jelu.utils.PluginInfoComparator
import org.springframework.stereotype.Service

@Service
class PluginInfoHolder(
    private val properties: JeluProperties,
    private val providers: List<IMetaDataProvider>,
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
                    "databazeknih" -> 5
                    else -> 0
                }
            plugins.add(PluginInfo(name = name, order = order))
        }
        if (calibreEnabled()) {
            plugins.add(PluginInfo(name = CALIBRE, order = -100))
        }
        plugins.sortWith(PluginInfoComparator)
        pluginsList = plugins
        pluginsComputed = true
        return pluginsList
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
