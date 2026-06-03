declare module 'pdfjs-dist/build/pdf' {
  const pdfjsLib: any
  export = pdfjsLib
}

declare module 'pdfjs-dist/legacy/build/pdf' {
  const pdfjsLib: any
  export = pdfjsLib
}

declare module 'pdfjs-dist/build/pdf.worker.min.mjs?url' {
  const src: string
  export default src
}

declare module 'pdfjs-dist/legacy/build/pdf.worker.min.mjs?url' {
  const src: string
  export default src
}
