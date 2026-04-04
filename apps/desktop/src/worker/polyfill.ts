if (typeof globalThis.TextDecoder === 'undefined') {
    (globalThis as any).TextDecoder = class TextDecoder {
        decode(uint8Array?: Uint8Array) {
            if (!uint8Array) return '';
            let str = '';
            for (let i = 0; i < uint8Array.length; i++) {
                str += String.fromCharCode(uint8Array[i]);
            }
            return str;
        }
    };
}

if (typeof globalThis.TextEncoder === 'undefined') {
    (globalThis as any).TextEncoder = class TextEncoder {
        encode(str: string) {
            const arr = new Uint8Array(str.length);
            for (let i = 0; i < str.length; i++) {
                arr[i] = str.charCodeAt(i);
            }
            return arr;
        }
    };
}
