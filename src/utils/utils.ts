export const createSafeFraction = (numerator: number, denominator: number): number => {
    if (denominator === 0) {
        return 0
    }
    return numerator / denominator
}

export const removeElementsFromArray = <T>(superset: T[], subset: T[]): T[] => {
    const map = new Map<T, number>()
    for (const item of subset) {
        const count = map.get(item)
        if (count) {
            map.set(item, count + 1)
        } else {
            map.set(item, 1)
        }
    }

    for (const entry of map.entries()) {
        let counter = 0
        for (let i = superset.length - 1; i >= 0; i--) {
            if (counter >= entry[1]) break
            if (superset[i] === entry[0]) {
                superset.splice(i, 1)
                counter++
            }
        }
    }
    return superset
}
