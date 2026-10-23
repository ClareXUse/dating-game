# Edit the three strategy functions; keep the line protocol loop unchanged.
function set_preferences(n)
    w = zeros(n)
    k = min(n ÷ 2, 50)
    for j in 1:k
        w[j] = (100 ÷ k + (j <= 100 % k)) / 100
        w[k+j] = -w[j]
    end
    w
end
modify_preferences(n, turn, seconds, original, current, candidate, history, scores) = Float64[]
function propose_candidate(n, turn, seconds, candidates, scores)
    [sum(scores[j] * (candidates[j][i] - .5) for j in eachindex(scores)) >= 0 ? 1 : 0 for i in 1:n]
end

emit(v) = print(join(v, " "), " ")
for line in eachline(stdin)
    p = split(line)
    kind = p[1]
    if kind == "START"
        println("READY")
    elseif kind == "SET"
        n = parse(Int, p[2]); w = set_preferences(n)
        emit(w); emit(Int.(w .> 0)); emit(Int.(w .< 0)); println()
    elseif kind == "MODIFY"
        n = parse(Int,p[2]); turn = parse(Int,p[3]); seconds = parse(Float64,p[4])
        original = parse.(Float64,p[5:4+n]); current = parse.(Float64,p[5+n:4+2*n])
        candidate = parse.(Float64,p[5+2*n:4+3*n]); k = parse(Int,p[5+3*n]); offset = 6+3*n
        history = [parse.(Float64,p[offset+(j-1)*(n+1):offset+(j-1)*(n+1)+n-1]) for j in 1:k]
        scores = [parse(Float64,p[offset+(j-1)*(n+1)+n]) for j in 1:k]
        w = modify_preferences(n,turn,seconds,original,current,candidate,history,scores)
        isempty(w) ? print("KEEP") : emit(w)
        println()
    elseif kind == "CANDIDATE"
        n = parse(Int,p[2]); turn = parse(Int,p[3]); seconds = parse(Float64,p[4]); k = parse(Int,p[5])
        candidates = [parse.(Float64,p[6+(j-1)*(n+1):5+(j-1)*(n+1)+n]) for j in 1:k]
        scores = [parse(Float64,p[6+(j-1)*(n+1)+n]) for j in 1:k]
        emit(propose_candidate(n,turn,seconds,candidates,scores)); println()
    else
        error("Unknown message")
    end
    flush(stdout)
end
