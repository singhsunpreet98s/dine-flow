// Polyfill TextEncoder/TextDecoder for react-router-dom v7 in JSDOM environment.
import { TextEncoder, TextDecoder } from 'util'
Object.assign(global, { TextEncoder, TextDecoder })
