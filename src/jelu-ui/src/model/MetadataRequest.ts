import { PluginInfo } from "./PluginInfo";

export interface MetadataRequest {
    title?: string,
    isbn?:string,
    authors?: string,
    language?: string,
    plugins?: Array<PluginInfo>,
}
