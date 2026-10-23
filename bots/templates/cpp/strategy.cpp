// Edit strategy functions. Keep main() and the transport unchanged.
#include <algorithm>
#include <iostream>
#include <iomanip>
#include <sstream>
#include <string>
#include <vector>
using namespace std;

vector<double> set_preferences(int n) {
    vector<double> w(n,0); int k=min(n/2,50);
    for(int j=0;j<k;j++) {
        w[j]=(100/k+(j<100%k))/100.0;
        w[k+j]=-w[j];
    }
    return w;
}
vector<double> modify_preferences(int n,int turn,double time_remaining,
                                 const vector<double>& original,const vector<double>& current,
                                 const vector<double>& candidate,
                                 const vector<vector<double>>& history,const vector<double>& scores) {
    return {}; // Empty = KEEP. Otherwise return a complete legal weight vector.
}
vector<double> propose_candidate(int n,int turn,double time_remaining,
                                  const vector<vector<double>>& candidates,const vector<double>& scores) {
    vector<double> out(n);
    for(int i=0;i<n;i++) {
        double estimate=0;
        for(size_t j=0;j<scores.size();j++) estimate+=scores[j]*(candidates[j][i]-.5);
        out[i]=estimate>=0?1:0;
    }
    return out;
}

void emit(const vector<double>& v) {for(double x:v) cout<<setprecision(12)<<x<<' ';}
int main() {
    string line;
    while(getline(cin,line)) {
        istringstream in(line); string type; int n; in>>type;
        if(type=="START") {string role; in>>role>>n; cout<<"READY"<<endl;}
        else if(type=="SET") {
            in>>n; auto w=set_preferences(n); emit(w);
            vector<double> ideal(n),anti(n);
            for(int i=0;i<n;i++){ideal[i]=w[i]>0;anti[i]=w[i]<0;}
            emit(ideal);emit(anti);cout<<endl;
        } else if(type=="MODIFY") {
            int turn; double seconds; in>>n>>turn>>seconds;
            vector<double> original(n),current(n),candidate(n);
            for(double& x:original)in>>x;for(double& x:current)in>>x;for(double& x:candidate)in>>x;
            int k;in>>k;vector<vector<double>> history(k,vector<double>(n));vector<double> scores(k);
            for(int j=0;j<k;j++){for(double& x:history[j])in>>x;in>>scores[j];}
            auto w=modify_preferences(n,turn,seconds,original,current,candidate,history,scores);
            if(w.empty())cout<<"KEEP";else emit(w);cout<<endl;
        } else if(type=="CANDIDATE") {
            int turn,k;double seconds;in>>n>>turn>>seconds>>k;
            vector<vector<double>> c(k,vector<double>(n));vector<double> scores(k);
            for(int j=0;j<k;j++){for(double& x:c[j])in>>x;in>>scores[j];}
            emit(propose_candidate(n,turn,seconds,c,scores));cout<<endl;
        } else return 1;
    }
}
