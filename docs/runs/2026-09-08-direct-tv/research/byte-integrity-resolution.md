# Migration byte integrity

The review's delimiter-based slice excluded the source's terminal newline. Raw reads prove007is7812bytes, including its terminal LF. Its exact segment is wrapper bytes2292through10103, with SHA2562963a4fa0f19793d94196296358e4667482080160d410ec3c60871c33821ef4f, identical to the source and ledger value. The following LF belongs to the wrapper. No source or wrapper change was needed. Independent Terra repeated the review with explicit byte-boundary evidence and reported no actionable material defect.
