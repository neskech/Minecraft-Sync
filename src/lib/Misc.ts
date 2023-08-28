
export function strip(s: string): string {
    if (s.length == 0) return s
    
    let i = 0
    while (s[i] == ' ' || s[i] == '\n') i++

    let j = s.length - 1
    while (s[j] == ' ' || s[j] == '\n') j--

    return s.substring(i, j + 1)
}