const getDueDate = (days) => {
    const interval = days * 24 * 60 * 60 * 1000;
    return new Date(Date.now() + interval);
};

const calculateInterval = (reps, factor) => {
    if (reps === 1) return 1;
    if (reps === 2) return 6;
    return Math.ceil((reps - 1) * factor);
};

const supermemo = ({ grade, factor = 0, repetitions = 0 }) => {
    const MAX_GRADE = 5;

    // < 3: No idea.. or Maybe?.
    if (grade < 3) {
        return {
            factor, // same factor
            repetitions: 0, // reset reps
            interval: 0, // reset interval
            date: getDueDate(0), // repeat today
        };
    }

    // 3: Got it
    const calculatedFactor = +(
        factor +
        (0.1 - (MAX_GRADE - grade) * (0.08 + (MAX_GRADE - grade) * 0.02))
    ).toFixed(2);

    const newFactor = calculatedFactor > 1.3 ? calculatedFactor : 1.3;

    const newReps = repetitions + 1;
    if (grade === 3) {
        return {
            factor: newFactor, // calculate factor
            repetitions: newReps, // increment reps
            interval: 0, // reset interval
            date: getDueDate(0), // repeat today
        };
    }

    const newInterval = calculateInterval(newReps, newFactor);
    return {
        factor: newFactor, // calculate factor
        repetitions: newReps, // increment reps
        interval: newInterval, // calculate interval
        date: getDueDate(newInterval), // add interval to date
    };
};

export default supermemo;
