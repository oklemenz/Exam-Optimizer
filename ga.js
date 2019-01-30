(function() {
    "use strict";

    // Rules:
    // ======
    // x Every Student has exams in every assigned class
    // x The class teacher of the class is part of the exam
    // x Every exam needs the specified number of teachers (class teacher + other two teachers)
    // x The other two teachers do not need to have a relation to the class
    // x One teacher needs to have relation to subject
    // x A teacher can only have one exam at a certain timepoint
    // x All exams fit into the available timepoints
    // x A Student can only have one exam at a certain timepoint, the timepoint before and after (on same day)

    // Constraints:
    // ============
    // x Exams should be as condensed as possible for a teacher (ealier than late, no holes)
    // x Equal nummer of exams for each teacher on role subject and other teacher

    // Penality fitness costs (incl. default values)
    var INVALID_TIMEPOINT_PENALTY       	  = -10000;
    var INVALID_SUBJECT_TEACHER_PENALTY 	  = -5000;
    var INVALID_OTHER_TEACHER_PENALTY   	  = -2500;
    var TIMEPOINT_HOLES_PENALTY_CLASS_TEACHER = -1000;
    var TIMEPOINT_HOLES_PENALTY 			  = -100;
    var TIMEPOINT_LATE_PENALTY 				  = -50;
    var TEACHER_EQUAL_COUNT_PENALTY 		  = -25;

    var parameters = {};
    var timepoints = {};
    var teachers = {};
    var students = {};
    var exams = {};
    var exceptions = {};
    
	var minTimepoint = 0;
	var maxTimepoint = 0;
	
	var timepointsPerDay = {};
	var dayTimepoints = {};
	
	var debugActive = false;

    function Gene(examID, studentID, classTeacherID) {
        this.ID = examID;
        this.examID = examID;        
        this.studentID = studentID;
        this.classTeacherID = classTeacherID;
        this.timepointID = 0;
        this.subjectTeacherID = 0;
        this.otherTeacherID = 0;

        this.getExam = function() {
            return exams[this.examID];
        };

        this.getStudent = function() {
            return students[this.studentID];
        };

        this.getClassTeacher = function() {
            return teachers[this.classTeacherID];
        };

        this.getTimepoint = function() {
            return timepoints[this.timepointID];
        };

        this.getSubjectTeacher = function() {
            return teachers[this.subjectTeacherID];
        };

        this.getOtherTeacher = function() {
            return teachers[this.otherTeacherID];
        };
    }

    function Chromosome() {

        this.genes = {};
        this.valid = false;
        this.fitness = undefined;

        this.init = function(genes) {
        	if (genes) {
        		this.genes = genes;
        	} else {
	        	var that = this;
    	        _.reduce(_.shuffle(exams), function(genes, exam) {
        	        var gene = new Gene(exam.ID, exam.StudentID, exam.ClassTeacherID);
					_set(gene, genes);
		        	genes[gene.ID] = gene;
	                return genes;                
    	        }, this.genes);
            }
			this.validate();
            return this;
        };
	
		function _determine(timepoint, gene, genes, random) {
			var timepointID = timepoint ? timepoint.ID : 0;
			var prevTimepointID = previousTimepoint(timepointID);
			var nextTimepointID = nextTimepoint(timepointID);
			
			var valid = true;
			
			// Timepoint can only be used a certain times
			if (parameters.TimepointMultipleCount) {
				valid = !timepointID || _.filter(genes, function(aGene) {
					return  aGene.ID != gene.ID && 
						   (timepointID && aGene.timepointID == timepointID)
				}).length + 1 <= parameters.TimepointMultipleCount;
			}
			
			// Timepoint not in exception days for classTeacher
			var day = 0;
			if (valid) {
				if (timepoints[timepointID]) {
					day = timepoints[timepointID].Day;
					valid = !_.find(exceptions[day], function(teacher) {
						return teacher.ID == gene.classTeacherID;
					});
				}
			}

			// No other exam for class teacher at same timepoint
			if (valid) {
				valid = !timepointID || !_.find(genes, function(aGene) {
					return  aGene.ID != gene.ID &&
						   (timepointID && aGene.timepointID == timepointID) &&
						   (aGene.classTeacherID == gene.classTeacherID ||
 						    aGene.subjectTeacherID == gene.classTeacherID ||
 						    aGene.otherTeacherID == gene.classTeacherID)
				});
			}

			// No other exam for student found at timepoint, previous timepoint and next timepoint on same day
			if (valid) {
				valid = !timepointID || !_.find(genes, function(aGene) {
					return  aGene.ID != gene.ID &&
							aGene.studentID == gene.studentID &&
						   ((timepointID && aGene.timepointID == timepointID) || 
							(prevTimepointID && aGene.timepointID == prevTimepointID) ||
							(nextTimepointID && aGene.timepointID == nextTimepointID))
				});
			}

			if (valid) {
			
				// Find teachers not occupied in other exams at timepoint
				var availableTeachers = _.indexBy(_.filter(teachers, function(teacher) {
					return !timepointID || !_.find(genes, function(aGene) {
						return aGene.ID != gene.ID && 
							   (timepointID && aGene.timepointID == timepointID) && 
							   (aGene.classTeacherID == teacher.ID ||
								aGene.subjectTeacherID == teacher.ID ||
								aGene.otherTeacherID == teacher.ID);
					});
				}), "ID");
				
				// Exclude class teacher for subject and other teacher
				delete availableTeachers[gene.classTeacherID];

				// Filter teachers where timepoint not in their exception days
				if (timepoints[timepointID]) {
					availableTeachers = _.reduce(availableTeachers, function(context, availableTeacher) {
						if (!_.find(exceptions[day], function(exceptionTeacher) {
							return exceptionTeacher.ID == availableTeacher.ID;
						})) {
							context[availableTeacher.ID] = availableTeacher;
						}
						return context;
					}, {});
				}

				// Find subject teachers not occupied in other exams at timepoint					
				var subjectTeacher = undefined;
				if (gene.subjectTeacherID) {
					if (_.contains(availableTeachers, teachers[gene.subjectTeacherID])) {
						subjectTeacher = teachers[gene.subjectTeacherID];
					}
				} else {
					subjectTeacher = _.pick(availableTeachers, function(teacher) {
						return teacher.ID != gene.classTeacherID && !!_.find(teacher.Exams, function(teacherExam) {
							return teacherExam.Subject == gene.getExam().Subject;
						});
					}, random);
				}	
				
				// Exclude subject teacher for other teacher
				if (subjectTeacher) {
					delete availableTeachers[subjectTeacher.ID];
				}
				
				// Find other teacher not occupied in other exams at timepoint
				var otherTeacher = undefined;
				if (gene.otherTeacherID) {
					if (_.contains(availableTeachers, teachers[gene.otherTeacherID])) {
						otherTeacher = teachers[gene.otherTeacherID];
					}
				} else {
					otherTeacher = _.pick(availableTeachers, function(teacher) {
						return teacher.ID != gene.classTeacherID;
					}, true);
				}
				
				return { subjectTeacher : subjectTeacher, 
						 otherTeacher : otherTeacher };
			}
			
			return {};
		}
				
        function _set(gene, genes) {
        	if (gene.timepointID && gene.subjectTeacherID && gene.otherTeacherID) {
	        	return;
	        }

			var ranks = [];
			var setTimepoints = gene.timepointID ? [timepoints[gene.timepointID]] : _.union(_.shuffle(timepoints), [undefined]);
			_.each(setTimepoints, function(timepoint) {
				var result = _determine(timepoint, gene, genes, true);
				var rank = undefined;
				if (result.subjectTeacher && result.otherTeacher) {
					rank = 0;
				} else if (result.subjectTeacher) {
					rank = 1;					
				} else if (result.otherTeacher) {
					rank = 2;
				}
				if (rank != undefined && !ranks[rank]) {
					ranks[rank] = {
						timepointID : timepoint ? timepoint.ID : 0,
						subjectTeacherID : result.subjectTeacher ? result.subjectTeacher.ID : 0,
						otherTeacherID : result.otherTeacher ? result.otherTeacher.ID : 0
					};
				}
			});
			
			var geneBefore = _.clone(gene);
			
			if (_.size(ranks) > 0) {
				var rank = _.min(_.keys(ranks));
				gene.timepointID = ranks[rank].timepointID;
				gene.subjectTeacherID = ranks[rank].subjectTeacherID;
				gene.otherTeacherID = ranks[rank].otherTeacherID;
			}
			
			if (debugActive) {
				// use gene and geneBefore to trigger debugger
				// debugger;
			}
        };
        
        this.solve = function() {
			var genesByClassTeachers = _.groupBy(this.genes, function(gene) { 
				return gene.classTeacherID;
			});
		
			var sortedGenes = _.reduce(genesByClassTeachers, function(context, genesByClassTeacher, classTeacherID) {
				context = context.concat(genesByClassTeacher);
				return context;
			}, []);
		
			_.each(sortedGenes, function(gene) {
				if (!gene.timepointID) {
					_.each(timepoints, function(timepoint) {
						if (!gene.timepointID) {
							var result = _determine(timepoint, gene, sortedGenes, false);
							if (result.subjectTeacher && result.otherTeacher) {
								gene.timepointID = timepoint.ID;
								gene.subjectTeacherID = result.subjectTeacher.ID;
								gene.otherTeacherID = result.otherTeacher.ID;
							}
						}
					});
				}
			});
        
        	this.validate();
        	return this;
        }
        
        this.crossover = function(chromosome) {

            var newChromosome = new Chromosome();

            var sortedGenesChromosome1 = _.sortBy(this.genes, function(gene) {
				return gene.ID;
	        });
            var sortedGenesChromosome2 = _.sortBy(chromosome.genes, function(gene) {
				return gene.ID;
	        });
	        
			var split = _.random(0, _.size(exams) - 1);
			_.times(split, function(i) {
				var gene = sortedGenesChromosome1[i];
				newChromosome.genes[gene.ID] = _.clone(gene);
			});
			
			_.times(_.size(exams) - split, function(i) {
				var gene = sortedGenesChromosome2[split + i];
				newChromosome.genes[gene.ID] = _.clone(gene);
			});
            
            newChromosome.mutate();
            return newChromosome;
        };
        
        this.mutate = function() {
        	_.each(this.genes, function(gene) {
				if (Math.random() < parameters.MutationRate) {
					var place = _.random(0, 2);
					switch (place) {
						case 0:
							gene.timepointID = 0;
							break;
						case 1:
							gene.subjectTeacherID = 0;
							break;
						case 2:
							gene.otherTeacherID = 0;
							break;
					}
				}
        	});
			return this.repair();
        };
        
		this.repair = function() {
            this.validate();
            if (!this.valid) {

				var genesByTimepoint = _.groupBy(this.genes, function(gene) { 
					return gene.timepointID;
				});
				delete genesByTimepoint[0];

				// Timepoint can only be used a certain times
				if (parameters.TimepointMultipleCount) {
					_.each(genesByTimepoint, function(timepointGenes, timepointID) {
						if (timepointGenes.length > parameters.TimepointMultipleCount) {
							var diff = timepointGenes.length - parameters.TimepointMultipleCount;
							_.times(diff, function(n) {
								timepointGenes[n].timepointID = 0;	
							});
						}
					});
				}
 
				// Teacher has more than one exam per timepoint 
				// -> set teacher to 0 if subject or other teacher, else set timepoint to 0
				_.each(genesByTimepoint, function(timepointGenes, timepointID) {
					_.each(timepointGenes, function(gene) {
						if (gene.subjectTeacherID) {
							if (!!_.find(timepointGenes, function(aGene) {
								return (aGene.classTeacherID == gene.subjectTeacherID || 
										aGene.subjectTeacherID == gene.subjectTeacherID ||
										aGene.otherTeacherID == gene.subjectTeacherID) &&
										aGene.ID != gene.ID;
							})) {
								gene.subjectTeacherID = 0;
							}
						}
						if (gene.otherTeacherID) {
							if (!!_.find(timepointGenes, function(aGene) {
								return (aGene.classTeacherID == gene.otherTeacherID || 
										aGene.subjectTeacherID == gene.otherTeacherID || 
										aGene.otherTeacherID == gene.otherTeacherID) &&
										aGene.ID != gene.ID;
							})) {
								gene.otherTeacherID = 0;
							}
						}
					});
					_.each(timepointGenes, function(gene) {
						if (gene.classTeacherID) {
							if (!!_.find(timepointGenes, function(aGene) {
								return (aGene.classTeacherID == gene.classTeacherID || 
										aGene.subjectTeacherID == gene.classTeacherID ||
										aGene.otherTeacherID == gene.classTeacherID) &&
										aGene.ID != gene.ID;
							})) {
								gene.timepointID = 0;
							}
						}
					});
				});
				
				// Teacher has exams on an exception day for a timepoint -> set teacher to 0
				_.each(this.genes, function(gene) {
					if (gene.timepointID) {
						var day = timepoints[gene.timepointID].Day
						if (!!_.find(exceptions[day], function(teacher) {
							return teacher.ID == gene.subjectTeacherID;
						})) {
							gene.subjectTeacherID = 0;
						}
						if (!!_.find(exceptions[day], function(teacher) {
							return teacher.ID == gene.otherTeacherID;
						})) {
							gene.otherTeacherID = 0;
						}
					}
				});
				
				// Student has more than one exam at timepoint, previous timepoint and next timepoint on same day -> set timepoint to 0
				_.each(genesByTimepoint, function(timepointGenes, timepointID) {
					_.each(timepointGenes, function(gene) {
						// Same Student at same timepoint
						if (!!_.find(timepointGenes, function(aGene) {
							return aGene.studentID == gene.studentID && 
								   aGene.timepointID == timepointID &&
								   aGene.ID != gene.ID;
						})) {
							gene.timepointID = 0;
						}
						// Same Student at previous timepoint
						var prevTimepointID = previousTimepoint(timepointID);
						if (prevTimepointID) {
							// Find student in previous timepoint
							if (!!_.find(genesByTimepoint[prevTimepointID], function(aGene) {
								return aGene.studentID == gene.studentID && 
									   aGene.timepointID == prevTimepointID &&
									   aGene.ID != gene.ID;
							})) {
								gene.timepointID = 0;
							}
						}
						// Same Student at next timepoint
						var nextTimepointID = nextTimepoint(timepointID);
						if (nextTimepointID) {
							// Find student in next timepoint
							if (!!_.find(genesByTimepoint[nextTimepointID], function(aGene) {
								return aGene.studentID == gene.studentID && 
									   aGene.timepointID == nextTimepointID &&
									   aGene.ID != gene.ID;
							})) {
								gene.timepointID = 0;
							}
						}
					})
				});
				
				var genes = _.sortBy(this.genes, function(gene) { 
					return gene.timepointID;
				});
				_.each(genes, function(gene) {
					_set(gene, genes);
				});
				
				this.validate();
            }
            return this;
        };
        
        this.validate = function(excludeEmpty) {
        	// Check all variables are set
        	this.valid = true;
        	
        	if (!excludeEmpty) {
				this.valid = !_.find(this.genes, function(gene) {
					return !(gene.timepointID && gene.subjectTeacherID && gene.otherTeacherID);
				});
            }

			var genesByTimepoint = _.groupBy(this.genes, function(gene) { 
				return gene.timepointID;
			});
			delete genesByTimepoint[0];

			// Timepoint can only be used a certain times
            if (this.valid) {
				if (parameters.TimepointMultipleCount) {
					this.valid = !_.find(genesByTimepoint, function(timepointGenes, timepointID) {
						return timepointGenes.length > parameters.TimepointMultipleCount;
					});
				}
			}
            
			// Check teacher only has one exam per timepoint
            if (this.valid) {
				this.valid = !_.find(genesByTimepoint, function(timepointGenes, timepointID) {
					var teacherCounts = _.reduce(timepointGenes, function(result, gene) {
						result[gene.classTeacherID] = result[gene.classTeacherID] ? result[gene.classTeacherID] + 1 : 1;
						result[gene.subjectTeacherID] = result[gene.subjectTeacherID] ? result[gene.subjectTeacherID] + 1 : 1;
						result[gene.otherTeacherID] = result[gene.otherTeacherID] ? result[gene.otherTeacherID] + 1 : 1;
						return result;
					}, {});
					return !!_.find(teacherCounts, function(teacherCount, teacherID) {
						return teacherID > 0 && teacherCount > 1;
					});
				});
            }
            
            // Check teacher has no exams on exception days
			if (this.valid) {
				this.valid = !_.find(this.genes, function(gene) {
					if (gene.timepointID) {
						var day = timepoints[gene.timepointID].Day
						return !!_.find(exceptions[day], function(teacher) {
							return teacher.ID == gene.subjectTeacherID ||
		 						   teacher.ID == gene.otherTeacherID;
						});
					}
				});
			}
            
            // Check Student has only one exam at timepoint, previous timepoint and next timepoint on same day
			if (this.valid) {
				this.valid = !_.find(genesByTimepoint, function(timepointGenes, timepointID) {
					return !!_.find(timepointGenes, function(gene) {
						// Same Student at same timepoint
						if (!!_.find(timepointGenes, function(aGene) {
							return aGene.studentID == gene.studentID && 
								   aGene.ID != gene.ID;
						})) {
							return true;
						}
						// Same Student at previous timepoint
						var prevTimepointID = previousTimepoint(timepointID);
						if (prevTimepointID) {
							// Find student in previous timepoint
							if (!!_.find(genesByTimepoint[prevTimepointID], function(aGene) {
								return aGene.studentID == gene.studentID && 
   									   aGene.ID != gene.ID;
							})) {
								return true;
							}
						}
						// Same Student at next timepoint
						var nextTimepointID = nextTimepoint(timepointID);
						if (nextTimepointID) {
							// Find student in next timepoint
							if (!!_.find(genesByTimepoint[nextTimepointID], function(aGene) {
								return aGene.studentID == gene.studentID && 
									   aGene.ID != gene.ID;
							})) {
								return true;
							}
						}
						return false;
					});
				});
			}
			
            this.calcFitness();
            
            return this.valid;
        };

        this.calcFitness = function() {
        	var that = this;
        	
        	// Not set timepoint, subject or other teacher penalty
            this.fitness = _.reduce(this.genes, function(result, gene, key) {
            	result += gene.timepointID == 0 ? INVALID_TIMEPOINT_PENALTY : 0;
            	result += gene.subjectTeacherID == 0 ? INVALID_SUBJECT_TEACHER_PENALTY : 0;
            	result += gene.otherTeacherID == 0 ? INVALID_OTHER_TEACHER_PENALTY : 0;
            	return result;
            }, 0);
            
            // Timepoint hole and late penalty
			var validGenesByTeacher = {};
			var validGenesByClassTeacher = {};
			_.each(this.genes, function(gene) { 
				if (gene.timepointID) {
					if (gene.subjectTeacherID) {
						validGenesByTeacher[gene.subjectTeacherID] = validGenesByTeacher[gene.subjectTeacherID] || [];
						validGenesByTeacher[gene.subjectTeacherID].push(gene);
					}
					if (gene.otherTeacherID) {				
						validGenesByTeacher[gene.otherTeacherID] = validGenesByTeacher[gene.otherTeacherID] || [];
						validGenesByTeacher[gene.otherTeacherID].push(gene);
					}
					if (gene.classTeacherID) {
						validGenesByClassTeacher[gene.classTeacherID] = validGenesByClassTeacher[gene.classTeacherID] || [];
						validGenesByClassTeacher[gene.classTeacherID].push(gene);
					}
				}
			});
			
			function timepointFitnessPenalty(validGenesByTeacher, timepointHolePenalty, timepointLatePenalty) {
				_.each(validGenesByTeacher, function(validTeacherGenes, teacherID) {
					var genesPerDay = _.groupBy(validTeacherGenes, function(gene) { 
						return gene.getTimepoint().Day;
					});
					_.each(genesPerDay, function(genes, day) {
						if (genes.length > 0) {
							var maxTimepointGene = _.max(genes, function(gene) {
								return gene.timepointID;
							});
					
							var sumMaxTimepoint = maxTimepointGene.timepointID * (maxTimepointGene.timepointID + 1) / 2;
							var sumTimepoint = _.reduce(genes, function(sum, gene) {
								return sum + gene.timepointID;
							}, 0);
				
							// Avoid timepoint holes for a teacher
							that.fitness += (sumMaxTimepoint - sumTimepoint) * timepointHolePenalty;
					
							// Favor earlier timepoints to late timepoints => credit
							var dayTimepoint = dayTimepoints[day];
							var sumMaxDayTimepoint = dayTimepoint.max * (dayTimepoint.max + 1) / 2;
							that.fitness += (sumMaxTimepoint - sumMaxDayTimepoint) * timepointLatePenalty;
						}
					});
				});
			}
			
			timepointFitnessPenalty(validGenesByTeacher, TIMEPOINT_HOLES_PENALTY, TIMEPOINT_LATE_PENALTY);
			timepointFitnessPenalty(validGenesByClassTeacher, TIMEPOINT_HOLES_PENALTY_CLASS_TEACHER, TIMEPOINT_LATE_PENALTY);
			
	    	// Same amount of timepoints for teacher in role subject or other teacher => penalty
			var countTimepoints = _.reduce(validGenesByTeacher, function(count, validTeacherGenes, teacherID) {
				return count + _.reduce(validTeacherGenes, function(count, gene) {
					return count + (gene.subjectTeacher == teacherID ? 1 : 0) + 
				   				   (gene.otherTeacher == teacherID ? 1 : 0)
				}, 0);
			}, 0);
			
			var avgTimepoints = countTimepoints / _.size(validGenesByTeacher);
			
			_.each(validGenesByTeacher, function(validTeacherGenes, teacherID) {
				var timepointCount = _.reduce(validTeacherGenes, function(count, gene) {
					return count + (gene.subjectTeacher == teacherID ? 1 : 0) + 
				   				   (gene.otherTeacher == teacherID ? 1 : 0)
				}, 0);
				that.fitness += Math.abs(avgTimepoints - timepointCount) * TEACHER_EQUAL_COUNT_PENALTY;
			});
			
		    return this.fitness;
        };
    };

    function Population() {

        this.chromosomes = [];

        this.init = function() {
            var that = this;
            _.times(parameters.PopulationSize, function(i) {
                that.chromosomes.push(new Chromosome().init());
            });
            return this;
        };

        this.generation = function() {
            var newPopulation = new Population();
            // Order chromosomes by fitness descending
            var sortedChromosomes = _.sortBy(this.chromosomes, function(chromosome) {
            	return -chromosome.fitness;
            });
            var eliteCount = Math.floor(sortedChromosomes.length * parameters.ElitismRate);
            newPopulation.chromosomes = _.union(newPopulation.chromosomes, _.first(sortedChromosomes, eliteCount));
			_.times(Math.floor(sortedChromosomes.length / 2), function(i) {
				var c = i * 2;
				var chromsome1 = sortedChromosomes[c];
				var chromsome2 = sortedChromosomes[c+1];
				if (c < eliteCount || Math.random() < parameters.CrossoverRate) {
					newPopulation.chromosomes.push(chromsome1.crossover(chromsome2));
				} else {
					newPopulation.chromosomes.push(chromsome1);
				}
			});
            _.times(parameters.PopulationSize - newPopulation.chromosomes.length, function(i) {
                newPopulation.chromosomes.push(new Chromosome().init());
            });
            return newPopulation;
        };

        this.getFittestChromosome = function() {
            return _.first(_.sortBy(this.chromosomes, function(chromosome) {
            	return -chromosome.fitness;
            }));
        };
    };

    function run(progress, completed) {
		var i = 0;
		var stop = false;
	    var population = null;
		function runInLoop() {
		    if (!stop) {
		        progress(1.0 * (i+1) / parameters.GenerationCount);
				population = population.generation();
				i++;
				if (i == parameters.GenerationCount) {
					stop = true;
				}
		    	setTimeout(function() { 
					runInLoop(); 
				}, 0);
			} else {
				completed(population.getFittestChromosome().repair());
			}
		}
		progress(0);
		setTimeout(function() { 
        	population = new Population().init();
			runInLoop();
		}, 100);
    };

	function initGA(examData) {
		parameters = examData.Parameters;
        
        if (parameters.InvalidTimpointPenalty) {
	    	INVALID_TIMEPOINT_PENALTY = -parameters.InvalidTimpointPenalty;
	    }
	    if (parameters.InvalidSubjectTeacherPenalty) {
		    INVALID_SUBJECT_TEACHER_PENALTY = -parameters.InvalidSubjectTeacherPenalty;
	    }
	    if (parameters.InvalidOtherTeacherPenalty) {
		    INVALID_OTHER_TEACHER_PENALTY = -parameters.InvalidOtherTeacherPenalty;
	    }
	    if (parameters.TimpointHolesPenaltyClassTeacher) {
			TIMEPOINT_HOLES_PENALTY_CLASS_TEACHER = -parameters.TimpointHolesPenaltyClassTeacher;
	    }
	    if (parameters.TimpointHolesPenalty) {
			TIMEPOINT_HOLES_PENALTY = -parameters.TimpointHolesPenalty;
	    }
	    if (parameters.TimpointLatePenalty) {
		    TIMEPOINT_LATE_PENALTY = -parameters.TimpointLatePenalty;
	    }
	    if (parameters.TeacherEqualCountPenalty) {
		    TEACHER_EQUAL_COUNT_PENALTY = -parameters.TeacherEqualCountPenalty;
	    }
        
        timepoints = _.reduce(examData.Timepoints, function(context, timepoint) {
            context[timepoint.ID] = timepoint;
            return context;
        }, {});
        
        minTimepoint = _.min(_.pluck(timepoints, "ID"));
        maxTimepoint = _.max(_.pluck(timepoints, "ID"));
        
        timepointsPerDay = _.groupBy(timepoints, function(timepoint) {
			return timepoint.Day;
		});

		_.each(timepointsPerDay, function(aDayTimepoints, day) {
			dayTimepoints[day] = { 
				min : _.min(aDayTimepoints, function(timepoint) {
					return timepoint.ID;
				}).ID,
				max : _.max(aDayTimepoints, function(timepoint) {
					return timepoint.ID;
				}).ID
			};
		});
                
        teachers = _.reduce(examData.Teachers, function(context, teacher) {
            context[teacher.ID] = teacher;
            return context;
        }, {});
        
        students = _.reduce(examData.Students, function(context, student) {
            context[student.ID] = student;
            return context;
        }, {});
        
        exams = _.reduce(examData.Students, function(context, student) {
            _.each(student.Exams, function(exam) {
                var examCopy = _.clone(exam);
                examCopy.StudentID = student.ID;
                examCopy.Class = student.Class;
                var classTeacher = _.find(teachers, function(teacher) {
                    return !!_.find(teacher.Exams, function(teacherExam) {
                        return teacherExam.Class == examCopy.Class && teacherExam.Subject == examCopy.Subject;
                    });
                });
                if (!classTeacher) {
                    error("No class teacher found for exam (" + examCopy.Class + ", " + examCopy.Subject + ")");
                }
                examCopy.ClassTeacherID = classTeacher.ID;
                context[exam.ID] = examCopy;
            });
            return context;
        }, {});
        
        exceptions = _.reduce(examData.Exceptions, function(context, exception) {
			context[exception.Day] = _.map(exception.Teacher, function(exceptionTeacher) {
				var teacher = _.find(teachers, function(teacher) {
					return teacher.Code == exceptionTeacher.Code;
                });
                if (!teacher) {
	                error("Teacher code '" + exceptionTeacher.Code + "' not known in exceptions");
	            }
                return teacher;
			});
        	return context;
        }, {});
	}

    function startGA(examData, progress, completed) {
        initGA(examData);
		run(progress, function(chromosome) {
			 completed(convertChromosomeToResult(chromosome), chromosome);
		});        
    }

    function solveGA(examData, progress, completed) {
    	initGA(examData);
    	var genes = _.map(exams, function(exam) {
        	return new Gene(exam.ID, exam.StudentID, exam.ClassTeacherID);
    	});
		var chromosome = new Chromosome().init(genes)
		setTimeout(function() { 
			chromosome.solve();
			completed(convertChromosomeToResult(chromosome), chromosome);			
		}, 100);
    }
    
	function testGA(examData, chromosomeData) {
		var chromosome = new Chromosome();
		_.each(chromosomeData, function(geneData) {
			var gene = new Gene();
			_.extend(gene, geneData);
			chromosome.genes[gene.ID] = gene;
		});
		initGA(examData);
		chromosome.repair();
		return convertChromosomeToResult(chromosome);
	}

    function convertChromosomeToResult(chromosome) {
		var result = { 
			headers : ["Day", "Timepoint", "Student", "Subject", "Class", "Class Teacher", "Subject Teacher", "Other Teacher"], 
			rows : [] 
		};
		// Order gene by timepoint ascending
		var sortedGenes = _.sortBy(chromosome.genes, function(gene) {
			return gene.timepointID;
        });
		_.each(sortedGenes, function(gene) {
			var row = { cells : [] };
			row.cells.push({ content : gene.getTimepoint() ? gene.getTimepoint().Day : "" });
			row.cells.push({ content : gene.getTimepoint() ? gene.getTimepoint().Name : "" });
			row.cells.push({ content : gene.getStudent().Name });
			row.cells.push({ content : gene.getExam().Subject });
			row.cells.push({ content : gene.getExam().Class });
			row.cells.push({ content : gene.getClassTeacher().Name });
			row.cells.push({ content : gene.subjectTeacherID ? gene.getSubjectTeacher().Name : "" });
			row.cells.push({ content : gene.otherTeacherID ? gene.getOtherTeacher().Name : "" });
			result.rows.push(row);
		});
        return result;
    }

	function previousTimepoint(timepointID) {
		timepointID = parseInt(timepointID);
		var prevTimepointID = timepointID && timepointID > minTimepoint ? timepointID - 1 : undefined;
		if (prevTimepointID && timepoints[prevTimepointID]) {
			return timepoints[prevTimepointID].Day == timepoints[timepointID].Day ? prevTimepointID : undefined;
		}
		return undefined;
	}

	function nextTimepoint(timepointID) {
		timepointID = parseInt(timepointID);
		var nextTimepointID = timepointID && timepointID < maxTimepoint ? timepointID + 1 : undefined;
		if (nextTimepointID && timepoints[nextTimepointID]) {
			return timepoints[nextTimepointID].Day == timepoints[timepointID].Day ? nextTimepointID : undefined;
		}
		return undefined;
	}

    function objectFilter(object, filter) {
        if (filter) {
            object = _.reduce(object, function(result, instance, key) {
                if (filter(instance)) {
                    result[key] = instance;
                }
                return result;
            }, {});
        }
        return object;
    }
	
	function pick(object, filter, random) {
		return random ? pickRandom(object, filter) : pickFirst(object, filter);
	}
	
	function pickFirst(object, filter) {
        var keys = _.keys(_.objectFilter(object, filter));
        if (keys.length > 0) {
	        keys.sort();
            return object[keys[0]];
        }
        return undefined;
	}
	
    function pickRandom(object, filter) {
        var keys = _.keys(_.objectFilter(object, filter));
        if (keys.length > 0) {
            return object[keys[_.random(keys.length - 1)]];
        }
        return undefined;
    }

    function exclude(object, objectKey, excludeObject, constraint, excludeProperties, excludeSelf) {
        var constraintProperty = undefined;
        var constraintValue = undefined; 
        if (constraint) {
	        constraintProperty = _.first(_.keys(constraint));
    	    constraintValue = constraint[constraintProperty];
    	}
        return _.reduce(object, function(result, instance, key) {
            if (!_.find(excludeObject, function(excludeInstance) {
            	if (excludeInstance != excludeSelf) {
					if (!constraint || excludeInstance[constraintProperty] == constraintValue) {
						return !!_.find(excludeProperties, function(excludeProperty) {
							return excludeInstance[excludeProperty] == instance[objectKey];
						});
					}
                }
                return false;
            })) {
                result[key] = instance;
            }
            return result;
        }, {});
    }

    function error(error) {
        alert(error);
        throw Error(error);
    }
    
    function debug(active) {
		debugActive = active;
    }

    _.mixin({
        startGA : startGA,
        solveGA : solveGA,
        testGA : testGA,
        objectFilter : objectFilter,
        pick : pick,
        pickFirst : pickFirst,
        pickRandom : pickRandom,        
        exclude : exclude,
        error : error,
        debug : debug
    });
})();