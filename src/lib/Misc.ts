
export function strip(s: string): string {
    if (s.length == 0) return s
    
    let i = 0
    while (s[i] == ' ') i++

    let j = s.length - 1
    while (s[j] == ' ') j--

    return s.substring(i, j + 1)
}